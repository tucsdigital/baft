const WETRAVEL_API_URL = process.env.WETRAVEL_API_URL || 'https://api.wetravel.com/v3';
const WETRAVEL_AUTH_URL = process.env.WETRAVEL_AUTH_URL || (() => {
  try {
    const parsed = new URL(WETRAVEL_API_URL);
    return `${parsed.origin}/v2/auth/tokens/access`;
  } catch {
    return 'https://api.wetravel.com/v2/auth/tokens/access';
  }
})();

const partnerApiKey = process.env.WETRAVEL_API_KEY || process.env.WETRAVEL_API_TOKEN;
let cachedAccessToken: { value: string; expiresAt: number } | null = null;

export const wetravelEnabled = Boolean(partnerApiKey);

export async function getWeTravelAccessToken() {
  if (!partnerApiKey) throw new Error('Falta configurar WETRAVEL_API_KEY.');
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) return cachedAccessToken.value;

  const response = await fetch(WETRAVEL_AUTH_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${partnerApiKey}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`WeTravel no pudo emitir un access token (${response.status}).`);
  const value = String(payload?.access_token || payload?.token || '').trim();
  if (!value) throw new Error('WeTravel no devolvió access_token.');
  const expiresIn = Math.max(60, Number(payload?.expires_in ?? 3600) || 3600);
  cachedAccessToken = { value, expiresAt: Date.now() + expiresIn * 1000 };
  return value;
}

function asDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
}

export async function createWeTravelPaymentLink(input: {
  title: string;
  externalId: string;
  date: string;
  currency: string;
  amountMinor: number;
  description?: string;
}) {
  const accessToken = await getWeTravelAccessToken();
  const startDate = asDate(input.date);
  const body = {
    title: input.title.slice(0, 255),
    external_id: input.externalId.slice(0, 255),
    start_date: startDate,
    end_date: startDate,
    currency: input.currency.toUpperCase(),
    participant_fees: process.env.WETRAVEL_PARTICIPANT_FEES || 'service',
    package: {
      price: Math.max(1, Math.round(input.amountMinor)),
    },
  };
  const response = await fetch(`${WETRAVEL_API_URL.replace(/\/$/, '')}/payment_links`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`WeTravel rechazó el payment link (${response.status}): ${JSON.stringify(payload)}`);
  const resource = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  const url = resource?.checkout_url || resource?.url || resource?.payment_url || resource?.payment_link || resource?.link;
  if (!url) throw new Error('WeTravel no devolvió la URL del payment link.');
  return { url: String(url), id: String(resource.id || resource.uuid || ''), raw: payload };
}

export async function getWeTravelPaymentLink(paymentLinkId: string) {
  const accessToken = await getWeTravelAccessToken();
  const response = await fetch(
    `${WETRAVEL_API_URL.replace(/\/$/, '')}/payment_links/${encodeURIComponent(paymentLinkId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`WeTravel no pudo consultar el payment link (${response.status}).`);
  }
  return payload?.data && typeof payload.data === 'object' ? payload.data : payload;
}
