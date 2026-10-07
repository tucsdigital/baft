import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWeTravelEvent } from '../lib/wetravel-events.ts';
import { verifyWeTravelSignature } from '../lib/wetravel-webhook-signature.ts';
import { createHmac } from 'node:crypto';

test('verifica Svix raw body, timestamp, ID y secreto sin aceptar firmas antiguas', () => {
  const key = Buffer.from('only-a-test-secret-with-32-bytes!!');
  const secret = `whsec_${key.toString('base64')}`;
  const raw = '{"type":"booking.created","data":{}}';
  const id = 'msg_fixture';
  const makeHeaders = (timestamp: number) => new Headers({
    'svix-id': id, 'svix-timestamp': String(timestamp),
    'svix-signature': `v1,${createHmac('sha256', key).update(`${id}.${timestamp}.${raw}`).digest('base64')}`,
  });
  const now = Math.floor(Date.now() / 1000);
  const headers = makeHeaders(now);
  assert.equal(verifyWeTravelSignature(raw, headers, secret), true);
  assert.equal(verifyWeTravelSignature(raw + ' ', headers, secret), false);
  assert.equal(verifyWeTravelSignature(raw, headers, ''), false);
  assert.equal(verifyWeTravelSignature(raw, new Headers(), secret), false);
  assert.equal(verifyWeTravelSignature(raw, makeHeaders(now - 600), secret), false);
  assert.equal(verifyWeTravelSignature(raw, makeHeaders(now + 600), secret), false);
  headers.set('svix-id', 'msg_changed');
  assert.equal(verifyWeTravelSignature(raw, headers, secret), false);
});

test('normaliza el formato booking.created real sin usar precio o depósito como pago', () => {
  const data = {
    buyer: { id: 14848, cancelled: false, email: 'fixture@example.com', full_name: 'Test Buyer' },
    order_id: '2850299825402953728', trip_id: 'pkg-fixture', trip_uuid: '6741139422', trip_currency: 'ARS',
    total_deposit_amount: 47500000, total_due_amount: 0, total_paid_amount: 47500000, total_price_amount: 47500000,
  };
  const normalize = (changes: object) => normalizeWeTravelEvent({ type: 'booking.created', data: { ...data, ...changes } });
  const event = normalize({});
  assert.equal(event.status, 'paid');
  assert.equal(event.amountMinor, 47500000);
  assert.equal(event.currency, 'ars');
  assert.equal(event.externalId, 'pkg-fixture');
  assert.equal(event.paymentLinkId, '6741139422');
  assert.equal(event.bookingId, data.order_id);
  assert.equal(normalize({ total_paid_amount: 0 }).status, 'pending');
  assert.equal(normalize({ total_paid_amount: 100, total_due_amount: 47499900 }).status, 'pending');
  assert.equal(normalize({ total_paid_amount: undefined }).status, 'pending');
  assert.equal(normalize({ total_due_amount: undefined }).status, 'pending');
  assert.equal(normalize({ buyer: { ...data.buyer, cancelled: true } }).status, 'unknown');
});

test('normaliza un pago WeeTravel exitoso anidado', () => {
  const event = normalizeWeTravelEvent({
    id: 'evt-1',
    type: 'payment.updated',
    data: {
      external_id: 'pkg-123',
      payment_link_id: 'link-1',
      payment_id: 'pay-1',
      status: 'successful',
      amount: 47500000,
      currency: 'ARS',
      customer_email: 'cliente@example.com',
    },
  });
  assert.equal(event.eventId, 'evt-1');
  assert.equal(event.status, 'paid');
  assert.equal(event.externalId, 'pkg-123');
  assert.equal(event.amountMinor, 47500000);
  assert.equal(event.currency, 'ars');
});

test('normaliza estados fallidos, pendientes y reembolsos', () => {
  assert.equal(normalizeWeTravelEvent({ type: 'payment.updated', status: 'pending' }).status, 'pending');
  assert.equal(normalizeWeTravelEvent({ type: 'payment.updated', status: 'declined' }).status, 'failed');
  assert.equal(normalizeWeTravelEvent({ type: 'payment.updated', status: 'refunded' }).status, 'refunded');
});
