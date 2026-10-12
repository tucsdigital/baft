import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { guardAdmin } from '@/lib/vendor-admin';
import { buildReferredByFromCode, isConfirmedPayment, resolvePayoutStatus } from '@/lib/referrals';
import { getPaqueteById } from '@/lib/paquetes';

export const runtime = 'nodejs';

const schema = z.object({ apply: z.boolean().optional() });

async function hasConfirmedPayment(db: FirebaseFirestore.Firestore, reservationId: string): Promise<boolean> {
  const snap = await db.collection('reservas').doc(reservationId).collection('payments').get();
  return snap.docs.some((d) => isConfirmedPayment(d.data() as any));
}

/**
 * Reconstruye `referredBy` en ventas online que lo perdieron (verify-direct / WeTravel),
 * a partir del código guardado en su checkoutIntent. Solo toca reservas SIN `referredBy`.
 * También reclasifica la comisión (Pendiente <-> Devengada) según el estado y los pagos de la venta.
 * POST { apply: false } (por defecto) simula; { apply: true } escribe.
 */
export async function POST(request: Request) {
  const guard = await guardAdmin(request);
  if (guard instanceof NextResponse) return guard;
  const { db } = guard;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  const apply = parsed.success && parsed.data.apply === true;

  try {
    const intents = await db.collection('checkoutIntents').where('referral.code', '>', '').get();
    const report: Array<{ reservationId: string; code: string; vendor: string; applied: boolean }> = [];
    let skipped = 0;

    for (const intentDoc of intents.docs) {
      const intent = intentDoc.data() as any;
      const code = String(intent.referral?.code ?? '').trim();
      if (!code) continue;

      const candidates = [
        intent.reservationId,
        `wt_${intentDoc.id}`,
        intent.mercadoPagoPaymentId ? `mp_${intent.mercadoPagoPaymentId}` : null,
      ].filter(Boolean) as string[];

      let found: FirebaseFirestore.DocumentSnapshot | null = null;
      for (const id of Array.from(new Set(candidates))) {
        const snap = await db.collection('reservas').doc(String(id)).get();
        if (snap.exists) {
          found = snap;
          break;
        }
      }
      if (!found) continue;
      const reserva = found.data() as any;
      if (reserva.referredBy) {
        skipped += 1;
        continue;
      }

      const pkg = await getPaqueteById(String(reserva.packageId ?? reserva.experienceId ?? '')).catch(() => null);
      const referredBy = await buildReferredByFromCode({
        code,
        pkg,
        amountTotal: Number(reserva.amountTotal) || 0,
        people: Number(reserva.people) || 1,
        status: reserva.status,
        hasConfirmedPayment: await hasConfirmedPayment(db, found.id),
      });
      if (!referredBy) continue;

      if (apply) await found.ref.update({ referredBy, updatedAt: Timestamp.now() });
      report.push({ reservationId: found.id, code, vendor: referredBy.vendorName, applied: apply });
    }

    // Reclasificación de comisiones existentes.
    const reclassified: Array<{ reservationId: string; from: string; to: string }> = [];
    const open = await db.collection('reservas').where('referredBy.payoutStatus', 'in', ['pending', 'accrued']).get();
    for (const d of open.docs) {
      const r = d.data() as any;
      const from = String(r.referredBy?.payoutStatus ?? '');
      const to = resolvePayoutStatus({
        status: r.status,
        hasConfirmedPayment: await hasConfirmedPayment(db, d.id),
        current: from as any,
      });
      if (to === from) continue;
      if (apply) await d.ref.update({ 'referredBy.payoutStatus': to, updatedAt: Timestamp.now() });
      reclassified.push({ reservationId: d.id, from, to });
    }

    return NextResponse.json({
      ok: true,
      apply,
      fixed: report.length + reclassified.length,
      assigned: report.length,
      reclassified: reclassified.length,
      alreadyAssigned: skipped,
      reservations: report,
      payoutChanges: reclassified,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
