'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Check, ExternalLink, Loader2, Lock, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { isWeTravelPaymentUrl } from '@/lib/wetravel-tracking';
import { AnimatedCheck } from './SuccessConfirmation';
import { useWeTravelStatus } from './useWeTravelStatus';

type StepStatus = 'done' | 'active' | 'todo';
type View = 'preparing' | 'error' | 'ready' | 'pending' | 'processing' | 'confirmed' | 'failed' | 'review';

const launchedKey = (intentId: string) => `wetravel_launched_v1_${intentId}`;

function Step({ status, label }: { status: StepStatus; label: string }) {
  return (
    <li className="flex items-center gap-3.5">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
        status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white'
          : status === 'active' ? 'border-sky-200 bg-sky-50 text-sky-600' : 'border-slate-200 bg-white text-slate-300'
      }`}>
        {status === 'done' ? <Check className="h-4 w-4" strokeWidth={3} />
          : status === 'active' ? <Loader2 className="h-4 w-4 animate-spin" />
            : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <span className={`text-[15px] transition-colors ${status === 'todo' ? 'text-slate-400' : 'font-medium text-slate-900'}`}>{label}</span>
    </li>
  );
}

function Badge({ tone, children }: { tone: 'sky' | 'red' | 'amber'; children: React.ReactNode }) {
  const color = tone === 'red' ? 'bg-red-50 text-red-500' : tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-sky-50 text-sky-600';
  return <span className={`flex h-16 w-16 items-center justify-center rounded-full ${color}`}>{children}</span>;
}

export default function WeTravelPaymentModal({ open, onOpenChange, intentId, paymentUrl, creating, error: createError, onRetry, onBack }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intentId: string;
  paymentUrl: string;
  creating: boolean;
  error: string | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  const t = useTranslations('weTravelModal');
  const locale = useLocale();
  const router = useRouter();
  const [launched, setLaunched] = useState(false);
  const { state, error, timedOut, retry } = useWeTravelStatus(intentId, Boolean(intentId));

  useEffect(() => {
    if (!intentId) { setLaunched(false); return; }
    try { setLaunched(sessionStorage.getItem(launchedKey(intentId)) === '1'); } catch { setLaunched(false); }
  }, [intentId]);

  useEffect(() => {
    if (state !== 'confirmed') return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      params.set('intentId', intentId);
      params.set('paymentMethod', 'wetravel');
      for (const key of ['orderId', 'sessionId', 'payment_id', 'collection_id', 'external_reference', 'status', 'collection_status']) params.delete(key);
      router.replace(`/${locale}/checkout/success?${params}`);
    }, 1400);
    return () => clearTimeout(timer);
  }, [state, intentId, locale, router]);

  const markLaunched = () => {
    setLaunched(true);
    try { sessionStorage.setItem(launchedKey(intentId), '1'); } catch { /* Optional. */ }
  };

  const view: View = !intentId
    ? (createError && !creating ? 'error' : 'preparing')
    : state === 'pending' && !launched ? 'ready' : (state as View);
  const terminal = view === 'confirmed' || view === 'failed' || view === 'review';
  const showSteps = view === 'pending' || view === 'processing' || view === 'confirmed';
  const canPay = isWeTravelPaymentUrl(paymentUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="wetravel-modal"
        showCloseButton={view !== 'confirmed'}
        onInteractOutside={event => event.preventDefault()}
        className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-3xl border-slate-200 p-0 sm:max-w-md"
      >
        <div className="px-6 pb-6 pt-8 sm:px-8">
          <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex h-20 items-center justify-center"
              >
                {view === 'confirmed' ? <AnimatedCheck size={72} />
                  : view === 'failed' || view === 'error' ? <Badge tone="red"><XCircle className="h-8 w-8" strokeWidth={1.75} /></Badge>
                    : view === 'review' ? <Badge tone="amber"><AlertTriangle className="h-8 w-8" strokeWidth={1.75} /></Badge>
                      : view === 'preparing' ? <Badge tone="sky"><Loader2 className="h-8 w-8 animate-spin" strokeWidth={1.75} /></Badge>
                        : <Badge tone="sky"><ShieldCheck className="h-8 w-8" strokeWidth={1.75} /></Badge>}
              </motion.div>
            </AnimatePresence>
            <DialogTitle className="mt-4 text-balance text-xl font-semibold tracking-tight text-slate-900">{t(`${view}Title`)}</DialogTitle>
            <DialogDescription className="mt-2 text-balance text-sm leading-relaxed text-slate-500">
              {view === 'error' && createError ? createError : t(`${view}Description`)}
            </DialogDescription>
          </div>

          {showSteps ? (
            <ul className="mt-7 space-y-4 rounded-2xl bg-slate-50 p-5">
              <Step status="done" label={t('stepStarted')} />
              <Step status={view === 'pending' ? 'active' : 'done'} label={t('stepPayment')} />
              <Step status={view === 'confirmed' ? 'done' : view === 'processing' ? 'active' : 'todo'} label={t('stepReservation')} />
            </ul>
          ) : null}

          {!terminal && view !== 'ready' && view !== 'preparing' && view !== 'error' && (error || timedOut) ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{timedOut ? t('timeout') : t('connectionError')}</p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2.5">
            {view === 'ready' && canPay ? (
              <>
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={markLaunched}
                  className="group inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(15,23,42,0.6)] transition hover:bg-slate-700 active:scale-[0.98]"
                >
                  <Lock className="h-4 w-4" /> {t('payNow')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <p className="text-center text-xs text-slate-400">{t('secureNote')}</p>
              </>
            ) : null}
            {view === 'pending' && canPay ? (
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                {t('reopenPayment')} <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
            {view === 'pending' ? <p className="text-center text-xs text-slate-400">{t('noDoublePay')}</p> : null}
            {view === 'error' ? (
              <button type="button" onClick={onRetry} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-700">
                <RotateCcw className="h-4 w-4" /> {t('retry')}
              </button>
            ) : null}
            {!terminal && view !== 'preparing' && view !== 'error' && view !== 'ready' && (timedOut || error) ? (
              <button type="button" onClick={retry} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <RotateCcw className="h-4 w-4" /> {t('checkAgain')}
              </button>
            ) : null}
            {view === 'failed' ? (
              <button type="button" onClick={onBack} className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-700">
                {t('back')}
              </button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
