export type WeTravelNormalizedEvent = {
  eventId: string;
  eventType: string;
  status: string;
  externalId: string;
  paymentLinkId: string;
  paymentId: string;
  bookingId: string;
  amountMinor: number | null;
  currency: string;
  customerEmail: string;
  customerName: string;
  raw: any;
};

const SUCCESS = new Set(['paid', 'successful', 'succeeded', 'completed', 'approved', 'success']);
const PENDING = new Set(['pending', 'initiated', 'processing', 'in_process', 'created']);
const FAILED = new Set(['failed', 'declined', 'rejected', 'cancelled', 'canceled', 'expired']);
const REFUNDED = new Set(['refunded', 'refund', 'disputed', 'chargeback']);

function walk(value: any, depth = 0): any[] {
  if (!value || depth > 7 || typeof value !== 'object') return [];
  const values: any[] = [value];
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 20)) values.push(...walk(item, depth + 1));
  } else {
    for (const item of Object.values(value).slice(0, 80)) values.push(...walk(item, depth + 1));
  }
  return values;
}

function firstString(root: any, keys: string[]): string {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  for (const node of walk(root)) {
    if (!node || Array.isArray(node) || typeof node !== 'object') continue;
    for (const [key, value] of Object.entries(node)) {
      if (wanted.has(key.toLowerCase()) && value !== null && value !== undefined) {
        const result = String(value).trim();
        if (result) return result;
      }
    }
  }
  return '';
}

function firstAmount(root: any): number | null {
  const keys = new Set(['amount', 'amount_paid', 'paid_amount', 'total_amount', 'payment_amount', 'price']);
  for (const node of walk(root)) {
    if (!node || Array.isArray(node) || typeof node !== 'object') continue;
    for (const [key, value] of Object.entries(node)) {
      if (!keys.has(key.toLowerCase())) continue;
      const amount = typeof value === 'object' ? firstAmount(value) : Number(value);
      if (amount !== null && Number.isFinite(amount) && amount >= 0) return Math.round(amount);
    }
  }
  return null;
}

function normalizeStatus(root: any, eventType: string): string {
  const candidates = [
    firstString(root, ['payment_status', 'transaction_status', 'booking_status', 'status', 'state']),
    eventType,
  ].map((value) => value.toLowerCase().replace(/[^a-z_]/g, '_'));
  for (const value of candidates) {
    if (SUCCESS.has(value)) return 'paid';
    if (PENDING.has(value)) return 'pending';
    if (FAILED.has(value)) return 'failed';
    if (REFUNDED.has(value)) return value === 'disputed' || value === 'chargeback' ? 'disputed' : 'refunded';
  }
  return 'unknown';
}

export function normalizeWeTravelEvent(payload: any): WeTravelNormalizedEvent {
  const eventType = firstString(payload, ['event', 'event_type', 'type', 'action', 'name']).toLowerCase();
  return {
    eventId: firstString(payload, ['event_id', 'id', 'uuid']) || `hashless-${Date.now()}-${Math.random()}`,
    eventType,
    status: normalizeStatus(payload, eventType),
    externalId: firstString(payload, ['external_id', 'external_reference', 'trip_id']),
    paymentLinkId: firstString(payload, ['payment_link_id', 'payment_link_uuid', 'link_id']),
    paymentId: firstString(payload, ['payment_id', 'transaction_id', 'payment_uuid']),
    bookingId: firstString(payload, ['booking_id', 'booking_uuid', 'order_id']),
    amountMinor: firstAmount(payload),
    currency: firstString(payload, ['currency', 'currency_code']).toLowerCase(),
    customerEmail: firstString(payload, ['email', 'customer_email', 'participant_email']),
    customerName: firstString(payload, ['customer_name', 'participant_name', 'full_name', 'name']),
    raw: payload,
  };
}

export function isWeTravelPaymentEvent(event: WeTravelNormalizedEvent) {
  return /payment|transaction|booking/.test(event.eventType) || event.status !== 'unknown';
}
