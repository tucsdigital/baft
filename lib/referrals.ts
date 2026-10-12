import type { Vendor } from '@/types/vendor';
import type { Reservation } from '@/components/landing-reserva/types';
import { collection, doc, getDoc, getDocs, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

export type PayoutStatus = 'pending' | 'accrued' | 'paid' | 'cancelled';

export function nextPayoutStatusForReservationStatus(status: Reservation['status']): PayoutStatus {
  if (status === 'completed') return 'accrued';
  if (status === 'cancelled') return 'cancelled';
  return 'pending';
}

/** Un pago cuenta como confirmado si fue aprobado/registrado como pagado (no reembolsos ni ajustes). */
export function isConfirmedPayment(payment: { status?: unknown; movementType?: unknown }): boolean {
  const status = String(payment?.status ?? '').toLowerCase();
  const type = String(payment?.movementType ?? 'payment').toLowerCase();
  return (status === 'paid' || status === 'approved') && type === 'payment';
}

/**
 * Regla única del estado de la comisión:
 * - Anulada si la venta se canceló; Pagada se respeta siempre.
 * - Devengada si la venta está completada, o reservada con un pago confirmado.
 * - Pendiente en cualquier otro caso.
 */
export function resolvePayoutStatus(params: {
  status: Reservation['status'];
  hasConfirmedPayment: boolean;
  current?: PayoutStatus | null;
}): PayoutStatus {
  if (params.status === 'cancelled') return 'cancelled';
  if (params.current === 'paid') return 'paid';
  if (params.status === 'completed') return 'accrued';
  if (params.status === 'reserved' && params.hasConfirmedPayment) return 'accrued';
  return 'pending';
}

export async function reservationHasConfirmedPayment(reservationId: string): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, 'reservas', reservationId, 'payments'));
    return snap.docs.some((d) => isConfirmedPayment(d.data() as any));
  } catch {
    return false;
  }
}

/** Recalcula `referredBy.payoutStatus` de una reserva a partir de su estado y sus pagos. */
export async function syncReservationPayoutStatus(reservationId: string): Promise<PayoutStatus | null> {
  const ref = doc(db, 'reservas', reservationId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  if (!data.referredBy) return null;
  const next = resolvePayoutStatus({
    status: data.status,
    hasConfirmedPayment: await reservationHasConfirmedPayment(reservationId),
    current: data.referredBy.payoutStatus,
  });
  if (next !== data.referredBy.payoutStatus) {
    await updateDoc(ref, { 'referredBy.payoutStatus': next, updatedAt: Timestamp.now() });
  }
  return next;
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
  hasConfirmedPayment?: boolean;
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
      payoutStatus: resolvePayoutStatus({ status: params.status, hasConfirmedPayment: Boolean(params.hasConfirmedPayment) }),
    };
  } catch (error) {
    console.error('[referrals] No se pudo resolver el referido', error);
    return undefined;
  }
}