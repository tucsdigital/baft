'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2 } from 'lucide-react';

type Status = { paymentStatus: string; reservationCode?: string | null; reservationStatus?: string | null; emailJobs?: { cliente: string } };

export default function WeTravelVerification({ intentId }: { intentId: string }) {
  const [data, setData] = useState<Status | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let attempts = 0;
    const poll = async () => {
      try {
        const response = await fetch(`/api/wetravel/status?intentId=${encodeURIComponent(intentId)}`, { cache: 'no-store' });
        if (response.ok && active) setData(await response.json());
      } catch { if (active) setError(true); }
      attempts += 1;
      if (active && attempts < 20) window.setTimeout(poll, 3000);
    };
    poll();
    return () => { active = false; };
  }, [intentId]);
  if (error) return <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Estamos esperando la confirmación de WeeTravel.</p>;
  if (!data) return <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"><Loader2 className="h-4 w-4 animate-spin" />Verificando el estado del pago…</div>;
  const paid = data.paymentStatus === 'paid' || data.reservationStatus === 'reserved';
  return <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
    <div className="flex items-center gap-2 font-semibold">{paid ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <Clock className="h-5 w-5 text-amber-600" />}{paid ? 'Pago confirmado' : 'Pago en verificación'}</div>
    <p className="mt-2">{paid ? 'Estamos registrando tu reserva y preparando los emails.' : 'La reserva se confirmará automáticamente cuando WeeTravel informe el resultado.'}</p>
    {data.reservationCode ? <p className="mt-2 font-mono">Código de reserva: {data.reservationCode}</p> : null}
  </div>;
}
