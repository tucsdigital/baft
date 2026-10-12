import type { Vendor } from '@/types/vendor';
import type { Reservation } from '@/components/landing-reserva/types';
import { getReferralByCode, getVendorById } from '@/lib/vendors';

export function computeCommission(params: {
  amountTotal: number;
  people: number;
  vendor: Vendor;
  commissionOverride?: { type: 'percent' | 'fixed'; value: number; currency: 'ars' | 'brl' | 'usd' } | null;
}): { type: 'percent' | 'fixed'; value: number; currency: 'ars' | 'brl' | 'usd'; commissionAmount: number } {
  const def = params.commissionOverride ?? params.vendor.defaultCommission;
  if (def.type === 'percent') {
    const amount = Math.round(params.amountTotal * (def.value / 100));
    return { type: 'percent', value: def.value, currency: def.currency, commissionAmount: amount };
  }
  const amount = Math.round(def.value * 100);
  return { type: 'fixed', value: def.value, currency: def.currency, commissionAmount: amount };
}

export async function resolveReferralFromCode(code: string): Promise<{ vendor: Vendor; code: string } | null> {
  const ref = await getReferralByCode(code);
  if (!ref) return null;
  const vendor = await getVendorById(ref.vendorId);
  if (!vendor || !vendor.active) return null;
  return { vendor, code: ref.code };
}

export function nextPayoutStatusForReservationStatus(status: Reservation['status']): 'pending' | 'accrued' | 'paid' | 'cancelled' {
  if (status === 'completed') return 'accrued';
  if (status === 'cancelled') return 'cancelled';
  return 'pending';
}

/**
 * Arma `referredBy` para ventas automáticas (checkout online) a partir del código
 * del intento de pago. No lanza: si el código no existe o el vendedor está
 * inactivo devuelve `undefined` y la venta se registra igual, sin vendedor.
 */
export async function buildReferredByFromCode(params: {
  code?: string | null;
  pkg?: { bookingConfig?: { referralCommission?: { type: 'percent' | 'fixed'; value: number; currency: 'ars' | 'brl' | 'usd' } | null } } | null;
  amountTotal: number;
  people: number;
  status: Reservation['status'];
}) {
  const code = String(params.code ?? '').trim();
  if (!code) return undefined;
  try {
    const resolved = await resolveReferralFromCode(code);
    if (!resolved) return undefined;
    const override = params.pkg?.bookingConfig?.referralCommission;
    const comm = computeCommission({
      amountTotal: params.amountTotal,
      people: params.people,
      vendor: resolved.vendor,
      commissionOverride: override ? { type: override.type, value: override.value, currency: override.currency } : undefined,
    });
    return {
      vendorId: resolved.vendor.id,
      vendorName: resolved.vendor.name,
      code: resolved.code,
      channel: 'link' as const,
      commissionType: comm.type,
      commissionValue: comm.value,
      commissionCurrency: comm.currency,
      commissionAmount: comm.commissionAmount,
      payoutStatus: nextPayoutStatusForReservationStatus(params.status),
    };
  } catch (error) {
    console.error('[referrals] No se pudo resolver el referido', error);
    return undefined;
  }
}