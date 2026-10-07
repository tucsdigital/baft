export type WeTravelStatus = {
  status: string;
  paymentStatus: string;
  reservationId?: string | null;
  reservationCode?: string | null;
  reservationStatus?: string | null;
};

export function getWeTravelTrackingState(data: WeTravelStatus) {
  if (data.status === 'needs_review' || ['refunded', 'disputed', 'processing_error'].includes(data.paymentStatus)
    || data.reservationStatus === 'cancelled') return 'review';
  if (['failed', 'declined', 'rejected'].includes(data.paymentStatus)
    || ['failed', 'expired', 'cancelled'].includes(data.status)) return 'failed';
  if (data.paymentStatus === 'paid') {
    return data.reservationId && data.reservationCode && data.reservationStatus === 'reserved' ? 'confirmed' : 'processing';
  }
  return 'pending';
}

export function isWeTravelPaymentUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.port
      && ['wetravel.com', 'wetravel.to'].some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`));
  } catch { return false; }
}

export type WeTravelTrackingSession = { intentId: string; url: string };

export function parseWeTravelTrackingSession(value: unknown): WeTravelTrackingSession | null {
  if (!value || typeof value !== 'object') return null;
  const session = value as Partial<WeTravelTrackingSession>;
  if (typeof session.intentId !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(session.intentId)
    || !isWeTravelPaymentUrl(session.url)) return null;
  return { intentId: session.intentId, url: session.url };
}
