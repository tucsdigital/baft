'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { getWeTravelTrackingState, isWeTravelPaymentUrl, type WeTravelStatus } from '@/lib/wetravel-tracking';

const TRACKING_TIMEOUT = 10 * 60 * 1000;

export default function WeTravelVerification({ intentId, paymentUrl, onBack, redirectOnConfirmed = false }: {
  intentId: string;
  paymentUrl?: string;
  onBack?: () => void;
  redirectOnConfirmed?: boolean;
}) {
  const t = useTranslations('weTravelTracking');
  const locale = useLocale();
  const router = useRouter();
  const [data, setData] = useState<WeTravelStatus | null>(null);
  const [error, setError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    let active = true;
    let busy = false;
    let terminal = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const deadline = Date.now() + TRACKING_TIMEOUT;
    const isVisible = () => document.visibilityState !== 'hidden';
    const poll = async () => {
      if (!active || busy || terminal || !isVisible()) return;
      clearTimeout(timer);
      if (Date.now() >= deadline) { setTimedOut(true); return; }
      busy = true;
      controller = new AbortController();
      const requestTimeout = setTimeout(() => controller?.abort(), 15000);
      try {
        const response = await fetch(`/api/wetravel/status?intentId=${encodeURIComponent(intentId)}`, {
          cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) throw new Error('status_unavailable');
        const next: WeTravelStatus = await response.json();
        if (!next || typeof next.status !== 'string' || typeof next.paymentStatus !== 'string') throw new Error('invalid_status');
        if (!active) return;
        setData(next);
        setError(false);
        const state = getWeTravelTrackingState(next);
        terminal = ['confirmed', 'failed', 'review'].includes(state);
      } catch {
        if (active) setError(true);
      } finally {
        clearTimeout(requestTimeout);
        busy = false;
        if (active && !terminal && isVisible()) timer = setTimeout(poll, 3000);
      }
    };
    const resume = () => {
      clearTimeout(timer);
      void poll();
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
    };
  }, [intentId, cycle]);

  const state = data ? getWeTravelTrackingState(data) : 'pending';
  useEffect(() => {
    if (!redirectOnConfirmed || state !== 'confirmed') return;
    const params = new URLSearchParams(window.location.search);
    params.set('intentId', intentId);
    params.set('paymentMethod', 'wetravel');
    // Never forward another provider's return parameters into the success page.
    for (const key of ['orderId', 'sessionId', 'payment_id', 'collection_id', 'external_reference', 'status', 'collection_status']) params.delete(key);
    router.replace(`/${locale}/checkout/success?${params}`);
  }, [state, redirectOnConfirmed, intentId, locale, router]);

  const terminal = ['confirmed', 'failed', 'review'].includes(state);
  return (
    <section data-testid="wetravel-tracking" className="mx-auto w-full max-w-xl space-y-5 rounded-3xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm sm:p-8">
      <div role="status" aria-live="polite" className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">WeTravel</p>
        <h1 className="text-2xl font-bold break-words">{t(state)}</h1>
        <p className="text-sm leading-relaxed">{t(`${state}Description`)}</p>
        {data?.reservationCode && state === 'confirmed' ? <p className="break-all font-mono">{t('code')}: {data.reservationCode}</p> : null}
        {!terminal && error ? <p className="text-sm text-amber-800">{t('connectionError')}</p> : null}
        {!terminal && timedOut ? <p className="text-sm text-amber-800">{t('timeout')}</p> : null}
      </div>
      {data && state === 'pending' && !error && isWeTravelPaymentUrl(paymentUrl) ? (
        <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-center font-semibold text-white hover:bg-slate-700">
          {t('openPayment')}
        </a>
      ) : null}
      {paymentUrl && !terminal ? <p className="text-sm text-slate-500">{t('tabInstructions')}</p> : null}
      {!terminal && (timedOut || error) ? <button type="button" className="min-h-11 rounded-xl border px-4 py-2 font-semibold" onClick={() => {
        setTimedOut(false); setError(false); setCycle(value => value + 1);
      }}>{t('checkAgain')}</button> : null}
      {state === 'failed' && onBack ? <button type="button" onClick={onBack} className="min-h-11 rounded-xl border px-4 py-2 font-semibold">{t('back')}</button> : null}
    </section>
  );
}
