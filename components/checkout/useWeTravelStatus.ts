'use client';

import { useEffect, useState } from 'react';
import { getWeTravelTrackingState, type WeTravelStatus } from '@/lib/wetravel-tracking';

const TRACKING_TIMEOUT = 10 * 60 * 1000;

export type WeTravelStatusData = WeTravelStatus & {
  reservation?: {
    title: string | null;
    slug: string | null;
    date: string | null;
    people: number | null;
    amountTotal: number | null;
    currency: string | null;
    paymentMethod: string | null;
    extras: string[];
  } | null;
};

export function useWeTravelStatus(intentId: string, enabled = true) {
  const [data, setData] = useState<WeTravelStatusData | null>(null);
  const [error, setError] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (!enabled || !intentId) return;
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
        const next: WeTravelStatusData = await response.json();
        if (!next || typeof next.status !== 'string' || typeof next.paymentStatus !== 'string') throw new Error('invalid_status');
        if (!active) return;
        setData(next);
        setError(false);
        terminal = ['confirmed', 'failed', 'review'].includes(getWeTravelTrackingState(next));
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
  }, [intentId, enabled, cycle]);

  const state = data ? getWeTravelTrackingState(data) : 'pending';
  const retry = () => { setTimedOut(false); setError(false); setCycle(value => value + 1); };
  return { data, state, error, timedOut, retry };
}
