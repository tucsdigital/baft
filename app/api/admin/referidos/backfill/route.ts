import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Timestamp } from 'firebase-admin/firestore';
import { guardAdmin } from '@/lib/vendor-admin';
import { buildReferredByFromCode } from '@/lib/referrals';
import { getPaqueteById } from '@/lib/paquetes';

export const runtime = 'nodejs';

const schema = z.object({ apply: z.boolean().optional() });

/**
 * Reconstruye `referredBy` en ventas online que lo perdieron (verify-direct / WeTravel),
 * a partir del código guardado en su checkoutIntent. Solo toca reservas SIN `referredBy`.
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
      });
      if (!referredBy) continue;

      if (apply) await found.ref.update({ referredBy, updatedAt: Timestamp.now() });
      report.push({ reservationId: found.id, code, vendor: referredBy.vendorName, applied: apply });
    }

    return NextResponse.json({ ok: true, apply, fixed: report.length, alreadyAssigned: skipped, reservations: report });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error' }, { status: 500 });
  }
}
