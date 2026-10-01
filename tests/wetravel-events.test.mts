import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWeTravelEvent } from '../lib/wetravel-events.ts';

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
