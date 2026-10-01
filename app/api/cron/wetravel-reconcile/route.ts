import { NextResponse } from 'next/server';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getWeTravelPaymentLink } from '@/lib/wetravel';
import { normalizeWeTravelEvent } from '@/lib/wetravel-events';
import { finalizeWeTravelPaidCheckout, releaseWeTravelHold } from '@/lib/wetravel-finalize';

export const runtime = 'nodejs';

function authorized(request: Request) {
  const secret = String(process.env.CRON_SECRET || '').trim();
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const snap = await getDocs(query(collection(db, 'checkoutIntents'), where('provider', '==', 'wetravel'), limit(50)));
  let processed = 0;
  let inspected = 0;
  for (const item of snap.docs) {
    const intent: any = item.data();
    if (!['redirected', 'pending'].includes(String(intent.status || ''))) continue;
    const linkId = String(intent.wetravelPaymentLinkId || '').trim();
    if (!linkId) continue;
    inspected += 1;
    try {
      const link = await getWeTravelPaymentLink(linkId);
      const event = normalizeWeTravelEvent({
        event: 'payment.updated',
        event_id: `reconcile-${linkId}-${String(link?.updated_at || link?.updatedAt || Date.now())}`,
        external_id: intent.externalReference,
        payment_link_id: linkId,
        ...link,
      });
      if (event.status === 'paid') {
        await finalizeWeTravelPaidCheckout({ intentId: item.id, intentData: intent, event });
        processed += 1;
      } else if (event.status === 'failed') {
        await releaseWeTravelHold(item.id, intent, 'failed');
        processed += 1;
      }
    } catch (error) {
      console.error('[wetravel-reconcile] Error consultando payment link', linkId, error instanceof Error ? error.message : String(error));
    }
  }
  return NextResponse.json({ ok: true, inspected, processed });
}
