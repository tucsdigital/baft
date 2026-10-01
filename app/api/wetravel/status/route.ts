import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const intentId = String(new URL(request.url).searchParams.get('intentId') || '').trim();
  if (!intentId) return NextResponse.json({ error: 'Falta intentId.' }, { status: 400 });
  const intentSnap = await getDoc(doc(db, 'checkoutIntents', intentId));
  if (!intentSnap.exists()) return NextResponse.json({ error: 'Intento no encontrado.' }, { status: 404 });
  const intent: any = intentSnap.data();
  if (String(intent.provider || '') !== 'wetravel') return NextResponse.json({ error: 'El intento no pertenece a WeeTravel.' }, { status: 400 });
  const reservationId = String(intent.reservationId || '').trim();
  const reservationSnap = reservationId ? await getDoc(doc(db, 'reservas', reservationId)) : null;
  const reservation: any = reservationSnap?.exists() ? reservationSnap.data() : null;
  const jobIds = [
    String(reservation?.emailDelivery?.customerConfirmation?.jobId || `wt_${intentId}_cliente_confirm`),
    String(reservation?.emailDelivery?.customerVoucher?.jobId || `wt_${intentId}_cliente_voucher`),
    String(reservation?.emailDelivery?.adminNotification?.jobId || `wt_${intentId}_admin`),
  ];
  const jobs = await Promise.all(jobIds.map((id) => getDoc(doc(db, 'emailJobs', id))));
  return NextResponse.json({
    ok: true,
    intentId,
    status: String(intent.status || 'created'),
    paymentStatus: String(intent.wetravelStatus || 'unknown'),
    reservationId: reservationId || null,
    reservationCode: reservation?.reservationCode || null,
    reservationStatus: reservation?.status || null,
    emailJobs: { cliente: jobs[0].exists() ? String(jobs[0].data()?.status || 'pending') : 'missing', voucher: jobs[1].exists() ? String(jobs[1].data()?.status || 'pending') : 'missing', admin: jobs[2].exists() ? String(jobs[2].data()?.status || 'pending') : 'missing' },
  });
}
