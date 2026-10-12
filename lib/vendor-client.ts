import type { User } from 'firebase/auth';

export type VendorReservationRow = {
  id: string;
  reservationCode: string | null;
  createdAt: string | null;
  date: string | null;
  experienceTitle: string;
  customerName: string;
  amountTotal: number;
  currency: string;
  status: string;
  source: 'manual' | 'online';
  referredBy: {
    code: string | null;
    commissionAmount: number;
    commissionCurrency: string | null;
    payoutStatus: 'pending' | 'accrued' | 'paid' | 'cancelled';
  };
};

export async function fetchVendorReservations(user: User): Promise<VendorReservationRow[]> {
  const token = await user.getIdToken();
  const res = await fetch('/api/vendor/reservas', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || 'No se pudieron cargar las reservas');
  return data.reservations as VendorReservationRow[];
}
