import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { arrayUnion, collection, doc, getDocs, query, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { normalizeWeTravelEvent } from '@/lib/wetravel-events';
import { finalizeWeTravelPaidCheckout, releaseWeTravelHold } from '@/lib/wetravel-finalize';

export const runtime = 'nodejs';

function verifySignature(raw: string, request: Request) {
  const secret = String(process.env.WETRAVEL_WEBHOOK_SECRET || '').trim();
  if (!secret) return true;
  const supplied = String(request.headers.get('x-wetravel-signature') || request.headers.get('x-webhook-signature') || '').trim();
  if (!supplied) return false;
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const normalized = supplied.replace(/^sha256=/i, '').trim();
  if (expected.length !== normalized.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(normalized));
}

async function findIntent(event: ReturnType<typeof normalizeWeTravelEvent>) {
  if (event.externalId) {
    const snap = await getDocs(query(collection(db, 'checkoutIntents'), where('externalReference', '==', event.externalId)));
    if (!snap.empty) return snap.docs[0];
  }
  if (event.paymentLinkId) {
    const snap = await getDocs(query(collection(db, 'checkoutIntents'), where('wetravelPaymentLinkId', '==', event.paymentLinkId)));
    if (!snap.empty) return snap.docs[0];
  }
  return null;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifySignature(raw, request)) return NextResponse.json({ error: 'Firma inválida o ausente.' }, { status: 401 });
  let payload: any;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const event = normalizeWeTravelEvent(payload);
  const { raw: _rawEvent, ...normalizedEvent } = event;
  const eventId = event.eventId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 150);
  const eventRef = doc(db, 'wetravelEvents', eventId);
  const existing = await getDocs(query(collection(db, 'wetravelEvents'), where('eventId', '==', event.eventId)));
  if (!existing.empty && String(existing.docs[0].data()?.processingStatus || '') === 'processed') {
    return NextResponse.json({ received: true, duplicate: true });
  }
  await setDoc(eventRef, {
    provider: 'wetravel', eventId: event.eventId, eventType: event.eventType,
    normalized: normalizedEvent, payload, processingStatus: 'received', receivedAt: Timestamp.now(),
  }, { merge: true });

  const intentSnap = await findIntent(event);
  if (!intentSnap) {
    await updateDoc(eventRef, { processingStatus: 'unmatched', processedAt: Timestamp.now(), processingMessage: 'No se encontró checkoutIntent.' });
    return NextResponse.json({ received: true, processed: false, reason: 'unmatched' }, { status: 202 });
  }
  const intentId = intentSnap.id;
  const intentData: any = intentSnap.data();

  try {
    if (['completed', 'paid'].includes(String(intentData.status || '')) && event.status !== 'refunded' && event.status !== 'disputed') {
      await updateDoc(eventRef, { processingStatus: 'ignored', processingResult: 'stale_after_completion', processedAt: Timestamp.now(), intentId });
      return NextResponse.json({ received: true, processed: false, reason: 'stale_after_completion' });
    }
    if (event.status === 'paid') {
      if (String(intentData.provider || '') !== 'wetravel') throw new Error('El intent no pertenece a WeeTravel.');
      const result = await finalizeWeTravelPaidCheckout({ intentId, intentData, event });
      await updateDoc(eventRef, { processingStatus: 'processed', processingResult: result, processedAt: Timestamp.now(), intentId });
      return NextResponse.json({ received: true, processed: true, intentId, ...result });
    }
    if (event.status === 'failed') {
      await releaseWeTravelHold(intentId, intentData, 'failed');
      await updateDoc(eventRef, { processingStatus: 'processed', processingResult: 'failed', processedAt: Timestamp.now(), intentId });
      return NextResponse.json({ received: true, processed: true, intentId, status: 'failed' });
    }
    if (event.status === 'pending') {
      await updateDoc(doc(db, 'checkoutIntents', intentId), { status: 'pending', wetravelStatus: 'pending', updatedAt: Timestamp.now() });
      await updateDoc(eventRef, { processingStatus: 'processed', processingResult: 'pending', processedAt: Timestamp.now(), intentId });
      return NextResponse.json({ received: true, processed: true, intentId, status: 'pending' });
    }
    if (event.status === 'refunded' || event.status === 'disputed') {
      const reservationId = String(intentData.reservationId || '').trim();
      if (reservationId) {
        await updateDoc(doc(db, 'reservas', reservationId), {
          status: event.status === 'refunded' ? 'cancelled' : 'pending',
          wetravelStatus: event.status,
          statusHistory: arrayUnion({ status: event.status === 'refunded' ? 'cancelled' : 'pending', actor: 'system', note: `WeTravel informó ${event.status}.`, createdAt: Timestamp.now() }),
          updatedAt: Timestamp.now(),
        });
      }
      await updateDoc(doc(db, 'checkoutIntents', intentId), { status: 'needs_review', wetravelStatus: event.status, updatedAt: Timestamp.now() });
      await updateDoc(eventRef, { processingStatus: 'processed', processingResult: event.status, processedAt: Timestamp.now(), intentId });
      return NextResponse.json({ received: true, processed: true, intentId, status: event.status });
    }
    await updateDoc(eventRef, { processingStatus: 'ignored', processingResult: 'unknown_status', processedAt: Timestamp.now(), intentId });
    return NextResponse.json({ received: true, processed: false, reason: 'unknown_status' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateDoc(eventRef, { processingStatus: 'failed', processingMessage: message.slice(0, 500), intentId, updatedAt: Timestamp.now() });
    await updateDoc(doc(db, 'checkoutIntents', intentId), { status: 'needs_review', wetravelStatus: 'processing_error', wetravelProcessingError: message.slice(0, 500), updatedAt: Timestamp.now() }).catch(() => {});
    return NextResponse.json({ error: 'No se pudo procesar el evento WeeTravel.', intentId }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', provider: 'wetravel' });
}
