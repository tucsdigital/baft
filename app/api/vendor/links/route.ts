import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { guardVendor } from '@/lib/vendor-guard';
import { REFERRAL_LINKS_COLLECTION, RESERVATIONS_COLLECTION } from '@/lib/vendor-admin';

export const runtime = 'nodejs';

const PACKAGES = 'paquetes';
type Ccy = 'ars' | 'brl' | 'usd';

const idSchema = z.object({ linkId: z.string().min(1) });
const createSchema = z.object({ packageId: z.string().min(1) });

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

function toIso(value: any): string | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' ? value : null;
}

function genCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

function allowedList(vendor: Record<string, any>): string[] | null {
  const list = vendor.allowedPackages ?? vendor.allowedExperiences;
  return Array.isArray(list) && list.length > 0 ? list.map(String) : null;
}

async function loadPackages(db: FirebaseFirestore.Firestore, vendor: Record<string, any>) {
  const snap = await db.collection(PACKAGES).where('visible', '==', true).get();
  const allowed = allowedList(vendor);
  return snap.docs
    .map((d) => {
      const data = d.data() as any;
      return { id: d.id, title: String(data.titulo ?? data.title ?? ''), slug: String(data.slug ?? '') };
    })
    .filter((p) => p.title && p.slug && (!allowed || allowed.includes(p.id)))
    .sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

async function loadLinks(db: FirebaseFirestore.Firestore, vendorId: string, packages: Map<string, { title: string; slug: string }>) {
  const snap = await db.collection(REFERRAL_LINKS_COLLECTION).where('vendorId', '==', vendorId).get();
  const links = await Promise.all(
    snap.docs.map(async (d) => {
      const data = d.data() as any;
      const sales = await db.collection(RESERVATIONS_COLLECTION).where('referredBy.code', '==', data.code).get();
      const revenueByCurrency: Record<Ccy, number> = { ars: 0, brl: 0, usd: 0 };
      const commissionByCurrency: Record<Ccy, number> = { ars: 0, brl: 0, usd: 0 };
      let salesCount = 0;
      for (const s of sales.docs) {
        const r = s.data() as any;
        if (r.status !== 'completed') continue;
        salesCount += 1;
        const ccy = String(r.currency ?? '').toLowerCase() as Ccy;
        if (ccy in revenueByCurrency) revenueByCurrency[ccy] += Number(r.amountTotal) || 0;
        const cc = String(r.referredBy?.commissionCurrency ?? r.currency ?? '').toLowerCase() as Ccy;
        if (cc in commissionByCurrency) commissionByCurrency[cc] += Number(r.referredBy?.commissionAmount) || 0;
      }
      const pkg = data.experienceId ? packages.get(String(data.experienceId)) : undefined;
      return {
        id: d.id,
        vendorId,
        code: String(data.code ?? ''),
        active: Boolean(data.active),
        experienceId: data.experienceId ?? null,
        experienceName: pkg?.title ?? (data.experienceId ? 'Excursión no disponible' : 'Todas'),
        experienceSlug: pkg?.slug,
        createdAt: toIso(data.createdAt),
        salesCount,
        revenueByCurrency,
        commissionByCurrency,
      };
    })
  );
  return links.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));
}

async function snapshot(db: FirebaseFirestore.Firestore, vendorId: string, vendor: Record<string, any>) {
  const packages = await loadPackages(db, vendor);
  const all = new Map<string, { title: string; slug: string }>(packages.map((p) => [p.id, p]));
  // Enlaces de excursiones ya no visibles/permitidas: se resuelven por id para mostrar nombre.
  const linksRaw = await db.collection(REFERRAL_LINKS_COLLECTION).where('vendorId', '==', vendorId).get();
  for (const d of linksRaw.docs) {
    const id = String((d.data() as any).experienceId ?? '');
    if (id && !all.has(id)) {
      const p = await db.collection(PACKAGES).doc(id).get();
      if (p.exists) {
        const pd = p.data() as any;
        all.set(id, { title: String(pd.titulo ?? pd.title ?? ''), slug: String(pd.slug ?? '') });
      }
    }
  }
  const links = await loadLinks(db, vendorId, all);
  return { vendorId, packages, links };
}

export async function GET(request: Request) {
  const ctx = await guardVendor(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({ ok: true, ...(await snapshot(ctx.db, ctx.vendorId, ctx.vendor)) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'No se pudieron cargar los enlaces', 500);
  }
}

export async function POST(request: Request) {
  const ctx = await guardVendor(request);
  if (ctx instanceof NextResponse) return ctx;
  const { db, vendorId, vendor } = ctx;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('Seleccioná una excursión', 400);
  const { packageId } = parsed.data;

  try {
    const allowed = allowedList(vendor);
    if (allowed && !allowed.includes(packageId)) return fail('No tenés permiso para esa excursión.', 403);

    const pkg = await db.collection(PACKAGES).doc(packageId).get();
    const pkgData = pkg.data() as any;
    if (!pkg.exists || pkgData?.visible !== true) return fail('La excursión no está disponible.', 404);

    const dup = await db
      .collection(REFERRAL_LINKS_COLLECTION)
      .where('vendorId', '==', vendorId)
      .where('experienceId', '==', packageId)
      .limit(1)
      .get();
    if (!dup.empty) return fail('Ya tenés un enlace para esa excursión.', 409);

    let code = '';
    for (let i = 0; i < 8; i++) {
      const candidate = genCode();
      const taken = await db.collection(REFERRAL_LINKS_COLLECTION).where('code', '==', candidate).limit(1).get();
      if (taken.empty) {
        code = candidate;
        break;
      }
    }
    if (!code) return fail('No se pudo generar un código único. Probá nuevamente.', 500);

    const now = Timestamp.now();
    await db.collection(REFERRAL_LINKS_COLLECTION).add({
      vendorId,
      code,
      active: true,
      utm: null,
      experienceId: packageId,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ ok: true, ...(await snapshot(db, vendorId, vendor)) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'No se pudo crear el enlace', 500);
  }
}

async function ownedLink(ctx: Exclude<Awaited<ReturnType<typeof guardVendor>>, NextResponse>, linkId: string) {
  const ref = ctx.db.collection(REFERRAL_LINKS_COLLECTION).doc(linkId);
  const snap = await ref.get();
  if (!snap.exists || (snap.data() as any).vendorId !== ctx.vendorId) return null;
  return { ref, data: snap.data() as any };
}

export async function PATCH(request: Request) {
  const ctx = await guardVendor(request);
  if (ctx instanceof NextResponse) return ctx;
  const parsed = idSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('Datos inválidos', 400);
  try {
    const link = await ownedLink(ctx, parsed.data.linkId);
    if (!link) return fail('Enlace no encontrado', 404);
    await link.ref.update({ active: false, updatedAt: Timestamp.now() });
    return NextResponse.json({ ok: true, ...(await snapshot(ctx.db, ctx.vendorId, ctx.vendor)) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'No se pudo desactivar', 500);
  }
}

export async function DELETE(request: Request) {
  const ctx = await guardVendor(request);
  if (ctx instanceof NextResponse) return ctx;
  const parsed = idSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail('Datos inválidos', 400);
  try {
    const link = await ownedLink(ctx, parsed.data.linkId);
    if (!link) return fail('Enlace no encontrado', 404);
    const sales = await ctx.db
      .collection(RESERVATIONS_COLLECTION)
      .where('referredBy.code', '==', link.data.code)
      .limit(1)
      .get();
    if (!sales.empty) return fail('No podés eliminar un enlace con ventas. Podés desactivarlo.', 409);
    await link.ref.delete();
    return NextResponse.json({ ok: true, ...(await snapshot(ctx.db, ctx.vendorId, ctx.vendor)) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'No se pudo eliminar', 500);
  }
}
