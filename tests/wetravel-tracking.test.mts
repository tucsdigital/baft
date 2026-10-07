import test from 'node:test';
import assert from 'node:assert/strict';
import { getWeTravelTrackingState, parseWeTravelTrackingSession } from '../lib/wetravel-tracking.ts';

test('tracking requires confirmed payment AND a created reservation with code', () => {
  const pending = { status: 'pending', paymentStatus: 'pending' };
  assert.equal(getWeTravelTrackingState(pending), 'pending');
  assert.equal(getWeTravelTrackingState({ ...pending, reservationStatus: 'reserved' }), 'pending');
  const paid = { status: 'completed', paymentStatus: 'paid' };
  assert.equal(getWeTravelTrackingState(paid), 'processing');
  assert.equal(getWeTravelTrackingState({ ...paid, reservationId: 'r1', reservationStatus: 'reserved' }), 'processing');
  const confirmed = { ...paid, reservationId: 'r1', reservationCode: 'BAFT-1', reservationStatus: 'reserved' };
  assert.equal(getWeTravelTrackingState(confirmed), 'confirmed');
  for (const paymentStatus of ['refunded', 'disputed', 'processing_error']) {
    assert.equal(getWeTravelTrackingState({ ...confirmed, paymentStatus }), 'review');
  }
  assert.equal(getWeTravelTrackingState({ ...confirmed, status: 'needs_review' }), 'review');
  assert.equal(getWeTravelTrackingState({ ...confirmed, reservationStatus: 'cancelled' }), 'review');
  assert.equal(getWeTravelTrackingState({ status: 'failed', paymentStatus: 'failed' }), 'failed');
  assert.equal(getWeTravelTrackingState({ status: 'redirected', paymentStatus: 'unknown' }), 'pending');
});

test('restored sessions contain only intent and a safe provider URL', () => {
  for (const url of ['https://www.wetravel.com/checkout/test', 'https://demo.wetravel.to/test']) {
    assert.deepEqual(parseWeTravelTrackingSession({ intentId: 'test-1', url, secret: 'ignored' }), { intentId: 'test-1', url });
  }
  for (const url of ['javascript:alert(1)', 'https://wetravel.com.evil.test', 'http://wetravel.com', 'https://user:pass@wetravel.com', '/checkout']) {
    assert.equal(parseWeTravelTrackingSession({ intentId: 'test', url }), null);
  }
  assert.equal(parseWeTravelTrackingSession({ intentId: '', url: 'https://wetravel.com' }), null);
});
