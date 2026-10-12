import { NextResponse } from 'next/server';
import { guardVendor, toJson } from '@/lib/vendor-guard';

export const runtime = 'nodejs';

/** Excursiones que el vendedor puede vender: visibles y permitidas. */
export async function GET(request: Request) {
  const ctx = await guardVendor(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const snap = await ctx.db.collection('paquetes').where('visible', '==', true).get();
    const packages = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((e: any) => e.titulo && e.slug && (!ctx.allowedPackages || ctx.allowedPackages.includes(e.id)))
      .map((e: any) =>
        toJson({
          id: e.id,
          titulo: e.titulo ?? e.title ?? '',
          slug: e.slug ?? '',
          moneda: e.moneda ?? 'ARS',
          precio: e.precio ?? 0,
          bookingConfig: e.bookingConfig,
          addons: e.addons ?? [],
          seatLayoutId: e.seatLayoutId ?? null,
          salidas: e.salidas ?? [],
        })
      )
      .sort((a: any, b: any) => String(a.titulo).localeCompare(String(b.titulo), 'es'));
    return NextResponse.json({ ok: true, packages });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No se pudieron cargar las excursiones' }, { status: 500 });
  }
}
