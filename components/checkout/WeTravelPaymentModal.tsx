'use client';

import { useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, ExternalLink, Loader2, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { isWeTravelPaymentUrl } from '@/lib/wetravel-tracking';
import { AnimatedCheck } from './SuccessConfirmation';
import { useWeTravelStatus } from './useWeTravelStatus';

type StepStatus = 'done' | 'active' | 'todo';

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

export default function WeTravelPaymentModal({ open, onOpenChange, intentId, paymentUrl, onBack }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intentId: string;
  paymentUrl: string;
  onBack: () => void;
}) {
  const t = useTranslations('weTravelModal');
  const locale = useLocale();
  const router = useRouter();
  const { state, error, timedOut, retry } = useWeTravelStatus(intentId);

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

  const waiting = state === 'pending';
  const processing = state === 'processing';
  const confirmed = state === 'confirmed';
  const failed = state === 'failed';
  const review = state === 'review';
  const terminal = confirmed || failed || review;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="wetravel-modal"
        showCloseButton={!confirmed}
        onInteractOutside={event => event.preventDefault()}
        className="max-w-[calc(100%-1.5rem)] gap-0 overflow-hidden rounded-3xl border-slate-200 p-0 sm:max-w-md"
      >
        <div className="px-6 pb-6 pt-8 sm:px-8">
          <div className="flex flex-col items-center text-center" role="status" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={state}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="flex h-20 items-center justify-center"
              >
                {confirmed ? <AnimatedCheck size={72} />
                  : failed ? <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500"><XCircle className="h-8 w-8" strokeWidth={1.75} /></span>
                    : review ? <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600"><AlertTriangle className="h-8 w-8" strokeWidth={1.75} /></span>
                      : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-600"><ShieldCheck className="h-8 w-8" strokeWidth={1.75} /></span>}
              </motion.div>
            </AnimatePresence>
            <DialogTitle className="mt-4 text-balance text-xl font-semibold tracking-tight text-slate-900">{t(`${state}Title`)}</DialogTitle>
            <DialogDescription className="mt-2 text-balance text-sm leading-relaxed text-slate-500">{t(`${state}Description`)}</DialogDescription>
          </div>

          {!terminal || confirmed ? (
            <ul className="mt-7 space-y-4 rounded-2xl bg-slate-50 p-5">
              <Step status="done" label={t('stepStarted')} />
              <Step status={waiting ? 'active' : 'done'} label={t('stepPayment')} />
              <Step status={confirmed ? 'done' : processing ? 'active' : 'todo'} label={t('stepReservation')} />
            </ul>
          ) : null}

          {!terminal && (error || timedOut) ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{timedOut ? t('timeout') : t('connectionError')}</p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2.5">
            {waiting && isWeTravelPaymentUrl(paymentUrl) ? (
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.98]">
                {t('openPayment')} <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
            {!terminal && (timedOut || error) ? (
              <button type="button" onClick={retry} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                <RotateCcw className="h-4 w-4" /> {t('checkAgain')}
              </button>
            ) : null}
            {failed ? (
              <button type="button" onClick={onBack} className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-700">
                {t('back')}
              </button>
            ) : null}
            {waiting ? <p className="text-center text-xs text-slate-400">{t('noDoublePay')}</p> : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
