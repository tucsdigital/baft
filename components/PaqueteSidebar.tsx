'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Paquete } from '@/types';
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Headphones, Info, MapPin, ShieldCheck, Users, X } from 'lucide-react';
import BookingAddonsStep from '@/components/paquete/BookingAddonsStep';
import { getWhatsAppLinkForPackage } from '@/lib/utils/whatsapp';
import {
  buildBookingCalendarMonth,
  filterAvailabilityToBookingWindow,
  getMaxSelectablePeople,
  type BookingAvailabilityItem,
} from '@/lib/packages/booking-calendar';
import { getPackageAddonOptions } from '@/lib/packages/resolve-departure';
import {
  buildLeadTimeMessage,
  getFirstBookableDateIso,
  getMinLeadHours,
  formatIsoDateEs,
} from '@/lib/packages/booking-rules';
import {
  clampPeopleBreakdownToMax,
  getPeopleBreakdownTotal,
  normalizePeopleBreakdown,
  normalizePeopleCategories,
  type PeopleBreakdown,
  type PeopleCategoryConfig,
} from '@/lib/packages/people-categories';

interface PaqueteSidebarProps {
  paquete: Paquete;
  bookingDates?: BookingAvailabilityItem[];
}

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MODAL_SPRING = { type: 'spring', stiffness: 340, damping: 32 } as const;

const modalSlideVariants = {
  enter: (direction: 1 | -1) => ({ opacity: 0, x: direction * 56 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: 1 | -1) => ({ opacity: 0, x: direction * -56 }),
};

const monthSlideVariants = {
  enter: (direction: 1 | -1) => ({ opacity: 0, x: direction * 32 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: 1 | -1) => ({ opacity: 0, x: direction * -32 }),
};

const monthLabelVariants = {
  enter: (direction: 1 | -1) => ({ opacity: 0, y: direction * 10 }),
  center: { opacity: 1, y: 0 },
  exit: (direction: 1 | -1) => ({ opacity: 0, y: direction * -10 }),
};

function parsePromoDeadline(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  const parsed = new Date(`${normalized}T23:59:59`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatPromoDeadline(value?: string | null) {
  const parsed = parsePromoDeadline(value);
  if (!parsed) return '';
  return parsed
    .toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .replace('.', '');
}

function formatDateLabel(value: string) {
  if (!value || value === 'sin-fecha') return 'A coordinar';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatMonthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
}

function isWithin48Hours(isoDate: string): boolean {
  const target = new Date(`${isoDate}T00:00:00`);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours > -24 && diffHours <= 48;
}

export default function PaqueteSidebar({ paquete, bookingDates = [] }: PaqueteSidebarProps) {
  const destino = paquete.destino || paquete.eventoLugar || '-';
  const duracion = paquete.duracion || '-';
  const bookingEnabled = paquete.bookingConfig?.enabled !== false;
  const maxPeoplePerBooking = paquete.bookingConfig?.maxPeoplePerBooking ?? paquete.capacidadMaxima ?? 6;
  const peopleCategories: PeopleCategoryConfig[] = useMemo(
    () => normalizePeopleCategories((paquete.bookingConfig as any)?.peopleCategories, maxPeoplePerBooking),
    [maxPeoplePerBooking, paquete.bookingConfig]
  );
  const specialPrice = Number(paquete.precioDescuentoPrimerosCupos ?? 0);
  const specialDeadline = formatPromoDeadline(paquete.tarifaEspecialFechaLimite);
  const specialDeadlineDate = parsePromoDeadline(paquete.tarifaEspecialFechaLimite);
  const [renderedAt] = useState(() => Date.now());
  const baseDate = useMemo(() => new Date(renderedAt), [renderedAt]);
  const minLeadHours = getMinLeadHours(paquete.bookingConfig);
  const firstBookableDateIso = useMemo(
    () => (minLeadHours > 0 ? getFirstBookableDateIso(minLeadHours, baseDate) : ''),
    [baseDate, minLeadHours]
  );
  const leadTimeNotice = useMemo(() => (minLeadHours > 0 ? buildLeadTimeMessage(minLeadHours) : ''), [minLeadHours]);
  const hasSpecialPrice =
    specialPrice > 0 &&
    paquete.precio > 0 &&
    specialPrice < paquete.precio &&
    Boolean(specialDeadline) &&
    Boolean(specialDeadlineDate && specialDeadlineDate.getTime() >= renderedAt);
  const [step, setStep] = useState<'people' | 'calendar' | 'addons'>('people');
  const [modalDirection, setModalDirection] = useState<1 | -1>(1);
  const [selectedDate, setSelectedDate] = useState('');
  const [monthCursor, setMonthCursor] = useState(0);
  const [monthDirection, setMonthDirection] = useState<1 | -1>(1);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [tooltipInfo, setTooltipInfo] = useState<{ visible: boolean; x: number; y: number; date: string }>({ visible: false, x: 0, y: 0, date: '' });
  const [pax, setPax] = useState<PeopleBreakdown>(() =>
    normalizePeopleBreakdown({ breakdown: null, categories: peopleCategories })
  );
  const people = Math.max(1, Math.floor(getPeopleBreakdownTotal(pax)));
  const whatsappHref = useMemo(() => getWhatsAppLinkForPackage(paquete.titulo), [paquete.titulo]);
  const paymentMethods = ['VISA', 'mastercard', 'NARANJA', 'mercado pago'];
  const condiciones = useMemo(
    () =>
      Array.isArray(paquete.condiciones)
        ? paquete.condiciones
          .map((item) => ({
            titulo: String(item?.titulo ?? '').trim(),
            texto: String(item?.texto ?? '').trim(),
          }))
          .filter((item) => item.titulo.length > 0 && item.texto.length > 0)
        : [],
    [paquete.condiciones]
  );

  const visibleBookingDates = useMemo(
    () => filterAvailabilityToBookingWindow(bookingDates, baseDate).sort((a, b) => a.date.localeCompare(b.date)),
    [baseDate, bookingDates]
  );

  const bookableBookingDates = useMemo(
    () => visibleBookingDates.filter((item) => item.available >= people),
    [people, visibleBookingDates]
  );

  const selectedAvailability = useMemo(
    () => visibleBookingDates.find((item) => item.date === selectedDate) ?? null,
    [selectedDate, visibleBookingDates]
  );

  const getSalidaForDate = (date: string) => paquete.salidas?.find((salida) => salida.fecha === date) ?? null;

  const addonOptions = useMemo(() => getPackageAddonOptions(paquete), [paquete]);
  const hasAddons = addonOptions.length > 0;
  const addonCurrencyLabel = getSalidaForDate(selectedDate)?.moneda || paquete.moneda || 'ARS';
  const selectedAddonsTotal = useMemo(
    () =>
      addonOptions
        .filter((addon) => selectedAddonIds.includes(addon.id))
        .reduce((sum, addon) => sum + Math.max(0, Number(addon.price) || 0) * people, 0),
    [addonOptions, selectedAddonIds, people]
  );

  const toggleAddon = (id: string) => {
    setSelectedAddonIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const months = useMemo(() => {
    const monthKeys = new Set(visibleBookingDates.map((item) => item.date.slice(0, 7)));
    return [...monthKeys].sort().map((key) => {
      const [year, month] = key.split('-').map(Number);
      return { year, month: month - 1 };
    });
  }, [visibleBookingDates]);

  const monthIndexForSelectedDate = () => {
    if (!selectedDate) return 0;
    const key = selectedDate.slice(0, 7);
    const index = months.findIndex((item) => `${item.year}-${String(item.month + 1).padStart(2, '0')}` === key);
    return index >= 0 ? index : 0;
  };

  const openCalendar = () => {
    setModalDirection(1);
    setMonthCursor(selectedDate ? monthIndexForSelectedDate() : 0);
    setStep('calendar');
  };

  const goToAddons = () => {
    if (!hasAddons) return;
    setSelectedAddonIds((current) => current.filter((addonId) => addonOptions.some((addon) => addon.id === addonId)));
    setModalDirection(1);
    setStep('addons');
  };

  const backToCalendar = () => {
    setModalDirection(-1);
    setMonthCursor(selectedDate ? monthIndexForSelectedDate() : 0);
    setStep('calendar');
  };

  const closeModal = () => setStep('people');

  useEffect(() => {
    if (!tooltipInfo.visible) return;
    const handler = () => setTooltipInfo({ visible: false, x: 0, y: 0, date: '' });
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [tooltipInfo.visible]);

  const maxSelectablePeopleForDate = getMaxSelectablePeople(selectedAvailability?.available ?? 0, maxPeoplePerBooking);

  useEffect(() => {
    const safeMax = Math.max(1, Math.floor(Number(maxPeoplePerBooking) || 1));
    const normalizedCategories = normalizePeopleCategories((paquete.bookingConfig as any)?.peopleCategories, safeMax);
    const normalized = normalizePeopleBreakdown({ breakdown: pax, categories: normalizedCategories });
    const clamped = clampPeopleBreakdownToMax({
      breakdown: normalized,
      categories: normalizedCategories,
      maxPeoplePerBooking: safeMax,
    });
    setPax((current) => (JSON.stringify(current) === JSON.stringify(clamped) ? current : clamped));
  }, [maxPeoplePerBooking, paquete.bookingConfig, pax]);

  useEffect(() => {
    if (!selectedDate || !selectedAvailability) return;
    if (maxSelectablePeopleForDate <= 0) {
      setSelectedDate('');
      return;
    }
    if (people <= maxSelectablePeopleForDate) return;
    setPax((current) =>
      clampPeopleBreakdownToMax({
        breakdown: current,
        categories: peopleCategories,
        maxPeoplePerBooking: maxSelectablePeopleForDate,
      })
    );
  }, [maxSelectablePeopleForDate, people, peopleCategories, selectedAvailability, selectedDate]);

  // Cursor de mes acotado a los meses con salidas disponibles (navegación única).
  const activeMonthIndex = Math.min(Math.max(0, monthCursor), Math.max(0, months.length - 1));
  const activeMonth = months[activeMonthIndex] ?? null;
  const activeMonthKey = activeMonth ? `${activeMonth.year}-${String(activeMonth.month + 1).padStart(2, '0')}` : '';
  const goPrevMonth = () => {
    if (activeMonthIndex <= 0) return;
    setMonthDirection(-1);
    setMonthCursor(activeMonthIndex - 1);
  };
  const goNextMonth = () => {
    if (activeMonthIndex >= months.length - 1) return;
    setMonthDirection(1);
    setMonthCursor(activeMonthIndex + 1);
  };

  // El modal bloquea el scroll de fondo y se cierra con Escape.
  useEffect(() => {
    if (step === 'people') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStep('people');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [step]);

  const bookingHref = useMemo(() => {
    const params = new URLSearchParams({
      slug: paquete.slug,
      date: selectedDate || 'sin-fecha',
      people: String(people),
      pax: JSON.stringify(pax),
    });
    if (selectedAddonIds.length > 0) {
      params.set('addons', selectedAddonIds.join(','));
    }
    return `/checkout?${params.toString()}`;
  }, [paquete.slug, people, pax, selectedAddonIds, selectedDate]);

  const modalSteps = hasAddons ? ['Fecha', 'Adicionales', 'Reserva'] : ['Fecha', 'Reserva'];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-black">
            Reserva directa
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Precio {paquete.mostrarDesde ? 'desde' : ''}
          </div>

          {hasSpecialPrice ? (
            <div className="mt-3">
              <div className="flex items-end gap-3 text-gray-500">
                <div className="text-[22px] font-semibold leading-none line-through decoration-2">
                  ${paquete.precio.toLocaleString('es-AR')}
                </div>
                <div className="mb-0.5 text-xs font-extrabold uppercase">{paquete.moneda || 'ARS'}</div>
              </div>

              <div className="mt-1 flex items-end gap-3">
                <div className="text-[44px] leading-none font-black tracking-[-0.03em] text-black">
                  ${specialPrice.toLocaleString('es-AR')}
                </div>
                <div className="mb-2 text-sm font-extrabold uppercase text-black">{paquete.moneda || 'ARS'}</div>
              </div>

              <div className="mt-2 text-sm font-semibold text-green-700">Tarifa especial</div>
              <div className="mt-1 text-sm text-gray-600">Vigente hasta el {specialDeadline}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Por persona</div>
            </div>
          ) : (
            <div className="mt-1 flex items-end gap-3">
              <div className="text-[44px] leading-none font-black tracking-[-0.02em] text-black">
                ${paquete.precio.toLocaleString('es-AR')}
              </div>
              <div className="mb-2 text-sm font-extrabold uppercase text-gray-600">{paquete.moneda || 'ARS'}</div>
            </div>
          )}
        </div>

        {String((paquete as any)?.fechaVencimiento ?? '').trim() ? (
          <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <Clock className="h-4 w-4 text-gray-600" />
            Vence: <span className="font-semibold text-gray-900">{String((paquete as any).fechaVencimiento)}</span>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          <div className="rounded-2xl bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <MapPin className="h-4 w-4 text-success" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destino</div>
                <div className="truncate text-sm font-bold text-black">{destino}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <Calendar className="h-4 w-4 text-success" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha elegida</div>
                <div className="truncate text-sm font-bold text-black">{formatDateLabel(selectedDate)}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-100">
                <Clock className="h-4 w-4 text-success" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duración</div>
                <div className="truncate text-sm font-bold text-black">{duracion}</div>
              </div>
            </div>
          </div>

          {bookingEnabled ? (
            <div className="rounded-2xl bg-white p-4">
              {step === 'people' ? (
                <div className="space-y-4">

                  <div className="">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Users className="h-4 w-4 text-success" />
                      Personas
                    </div>

                    <div className="mt-3 grid gap-3">
                      {peopleCategories.map((category) => {
                        const value = Math.max(0, Number(pax[category.key] ?? category.min) || 0);
                        const canIncrement = people < maxPeoplePerBooking && value < category.max;
                        const canDecrement = value > category.min;
                        const minLabel = category.min > 0 ? `Mínimo ${category.min}` : 'Opcional';
                        return (
                          <div
                            key={category.key}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3"
                          >
                            <div>
                              <div className="text-sm font-bold text-black">{category.label}</div>
                              <div className="text-xs text-slate-500">{minLabel}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setPax((current) => ({
                                    ...current,
                                    [category.key]: Math.max(category.min, (Number(current[category.key] ?? 0) || 0) - 1),
                                  }))
                                }
                                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-300 bg-white text-lg font-bold text-black transition hover:bg-gray-50 disabled:opacity-60"
                                aria-label={`Restar ${category.label}`}
                                disabled={!canDecrement}
                              >
                                -
                              </button>
                              <div className="min-w-[42px] text-center text-lg font-black text-black">{value}</div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!canIncrement) return;
                                  setPax((current) => ({
                                    ...current,
                                    [category.key]: Math.min(category.max, (Number(current[category.key] ?? 0) || 0) + 1),
                                  }));
                                }}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-300 bg-white text-lg font-bold text-black transition hover:bg-gray-50 disabled:opacity-60"
                                aria-label={`Sumar ${category.label}`}
                                disabled={!canIncrement}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-slate-600">
                        Total: <span className="font-extrabold text-black">{people}</span> · Máximo por reserva:{' '}
                        <span className="font-extrabold text-black">{maxPeoplePerBooking}</span>
                      </div>
                    </div>

                    {visibleBookingDates.length > 0 ? (
                      <button
                        type="button"
                        onClick={openCalendar}
                        disabled={bookableBookingDates.length === 0}
                        className="group mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 text-[15px] font-semibold tracking-[-0.01em] text-white transition-all duration-300 hover:bg-neutral-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-30"
                      >
                        Continuar
                        <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </button>
                    ) : (
                      <Link
                        href={bookingHref}
                        className="group mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 text-[15px] font-semibold tracking-[-0.01em] text-white transition-all duration-300 hover:bg-neutral-700 active:scale-[0.98]"
                      >
                        Reservar
                        <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </Link>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-slate-700">
              Las reservas online no están habilitadas para esta experiencia en este momento.
            </div>
          )}

          <div className='rounded-2xl bg-white px-4'>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 w-full items-center justify-center rounded-2xl border border-success bg-white font-bold text-success-strong transition hover:bg-green-50"
            >
              Consultar por WhatsApp
            </a>

            {condiciones.length > 0 ? (
              <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-slate-700 mt-4">
                {condiciones.map((item, index) => (
                  <div key={`${item.titulo}-${index}`} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <div className="min-w-0">
                      <div className="font-semibold text-black">{item.titulo}</div>
                      <div className="mt-0.5 text-slate-600">{item.texto}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-bold text-black">¿Tenés dudas?</div>
        <div className="mt-2 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100">
            <Headphones className="h-5 w-5 text-success" />
          </div>
          <div className="min-w-0">
            <div className="text-sm text-slate-700">Nuestro equipo te asesora de forma personalizada.</div>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-success hover:underline">
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-black">
          <ShieldCheck className="h-4 w-4 text-success" />
          Comprás tranquila
        </div>
        <p className="mt-1 text-xs text-slate-600">Tu compra está protegida</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {paymentMethods.map((method) => (
            <span key={method} className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-bold uppercase text-gray-600">
              {method}
            </span>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {bookingEnabled && step !== 'people' ? (
          <motion.div
            key="booking-modal"
            className="fixed inset-0 z-50 flex min-h-full items-center justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={MODAL_SPRING}
              role="dialog"
              aria-modal="true"
              aria-label="Elegí tu reserva"
              className="my-auto flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <div className="relative border-b border-gray-100 px-5 pb-4 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-gray-100 hover:text-black"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>

                {hasAddons ? (
                  <div className="mb-3 flex flex-wrap items-center gap-1.5 pr-10">
                    {modalSteps.map((label, index) => {
                      const done = step === 'addons' && index === 0;
                      const active = (step === 'calendar' && index === 0) || (step === 'addons' && index === 1);
                      return (
                        <div key={label} className="flex items-center gap-1.5">
                          <div
                            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide transition-colors duration-300 ${active
                              ? 'bg-black text-white'
                              : done
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-slate-400'
                              }`}
                          >
                            {done ? <CheckCircle2 className="h-3 w-3" /> : <span>{index + 1}</span>}
                            {label}
                          </div>
                          {index < modalSteps.length - 1 ? <div className="h-px w-3 bg-gray-200" /> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div className="text-lg font-extrabold text-black">
                  {step === 'calendar' ? 'Elegí tu fecha' : 'Sumá adicionales'}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {step === 'calendar' ? (
                    <>
                      Disponibilidad para <span className="font-extrabold text-black">{people}</span>{' '}
                      {people === 1 ? 'persona' : 'personas'}.
                    </>
                  ) : (
                    <>
                      <span className="font-extrabold text-black">{formatDateLabel(selectedDate)}</span>
                      {' · '}
                      <span className="font-extrabold text-black">{people}</span>{' '}
                      {people === 1 ? 'persona' : 'personas'}.
                    </>
                  )}
                </div>
              </div>

              <div className="max-h-[calc(100vh-14rem)] flex-1 overflow-y-auto px-5 py-4">
                <AnimatePresence mode="wait" initial={false} custom={modalDirection}>
                  {step === 'calendar' ? (
                    <motion.div
                      key="modal-calendar"
                      custom={modalDirection}
                      variants={modalSlideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={MODAL_SPRING}
                    >
                      {activeMonth ? (
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={goPrevMonth}
                              disabled={activeMonthIndex === 0}
                              aria-label="Mes anterior"
                              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900 active:scale-90 disabled:pointer-events-none disabled:opacity-25"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="relative flex-1 overflow-hidden text-center">
                              <AnimatePresence mode="wait" initial={false} custom={monthDirection}>
                                <motion.div
                                  key={activeMonthKey}
                                  custom={monthDirection}
                                  variants={monthLabelVariants}
                                  initial="enter"
                                  animate="center"
                                  exit="exit"
                                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                                  className="text-[15px] font-bold capitalize tracking-[-0.01em] text-neutral-900"
                                >
                                  {formatMonthLabel(activeMonth.year, activeMonth.month)}
                                </motion.div>
                              </AnimatePresence>
                              {months.length > 1 ? (
                                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                                  {activeMonthIndex + 1} / {months.length} meses con salidas
                                </div>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={goNextMonth}
                              disabled={activeMonthIndex >= months.length - 1}
                              aria-label="Mes siguiente"
                              className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-all duration-200 hover:bg-neutral-100 hover:text-neutral-900 active:scale-90 disabled:pointer-events-none disabled:opacity-25"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="relative mt-4 overflow-hidden">
                            <AnimatePresence mode="wait" initial={false} custom={monthDirection}>
                              <motion.div
                                key={activeMonthKey}
                                custom={monthDirection}
                                variants={monthSlideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
                                className="min-h-[296px]"
                              >
                                <div className="grid grid-cols-7 gap-1">
                                  {WEEK_DAYS.map((day, dayIndex) => (
                                    <div
                                      key={`${activeMonthKey}-weekday-${dayIndex}`}
                                      className="flex h-8 items-center justify-center text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400"
                                    >
                                      {day}
                                    </div>
                                  ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                  {buildBookingCalendarMonth({
                                    year: activeMonth.year,
                                    month: activeMonth.month,
                                    entries: visibleBookingDates,
                                    requiredPeople: people,
                                    minBookableDateIso: firstBookableDateIso,
                                  }).map((cell) => {
                                    const isSelected = selectedDate === cell.isoDate;
                                    const sharedClasses =
                                      'relative flex h-10 w-full items-center justify-center rounded-full text-[13px] font-semibold transition-all duration-200';
                                    const showInfo = isWithin48Hours(cell.isoDate) && cell.inMonth;

                                    const handleInfoClick = (event: React.MouseEvent) => {
                                      event.stopPropagation();
                                      if (tooltipInfo.visible && tooltipInfo.date === cell.isoDate) {
                                        setTooltipInfo({ visible: false, x: 0, y: 0, date: '' });
                                      } else {
                                        setTooltipInfo({
                                          visible: true,
                                          x: event.clientX,
                                          y: event.clientY,
                                          date: cell.isoDate,
                                        });
                                      }
                                    };

                                    const dayContent = (
                                      <span className="relative flex h-full w-full items-center justify-center">
                                        {cell.day}
                                        {cell.isSelectable && (
                                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-green-500" />
                                        )}
                                      </span>
                                    );

                                    const infoIcon = showInfo ? (
                                      <span
                                        className="absolute top-0.5 right-0.5 cursor-pointer z-10"
                                        onClick={handleInfoClick}
                                      >
                                        <Info className="h-3.5 w-3.5 text-blue-500 hover:text-blue-700 transition-colors" />
                                      </span>
                                    ) : null;

                                    if (!cell.inMonth) {
                                      return <div key={cell.isoDate} className={sharedClasses} aria-hidden="true" />;
                                    }

                                    if (cell.isSelectable) {
                                      return (
                                        <button
                                          key={cell.isoDate}
                                          type="button"
                                          onClick={() => setSelectedDate(cell.isoDate)}
                                          className={`${sharedClasses} ${isSelected
                                            ? 'scale-105 bg-neutral-900 text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.5)]'
                                            : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-900 hover:text-white'
                                            }`}
                                          aria-label={`Seleccionar ${formatDateLabel(cell.isoDate)}. ${cell.available} cupos disponibles.`}
                                          aria-pressed={isSelected}
                                        >
                                          {dayContent}
                                          {infoIcon}
                                        </button>
                                      );
                                    }

                                    return (
                                      <div
                                        key={cell.isoDate}
                                        className={`${sharedClasses} ${cell.isSoldOut
                                          ? 'text-neutral-300 line-through'
                                          : cell.isTooSoon
                                            ? 'text-amber-500/60'
                                            : 'text-neutral-200'
                                          }`}
                                        aria-label={
                                          cell.isSoldOut
                                            ? `${cell.day} agotado`
                                            : cell.isTooSoon
                                              ? `${cell.day} fuera del plazo de reserva (mínimo ${minLeadHours} hs de anticipación)`
                                              : `${cell.day} sin salida`
                                        }
                                      >
                                        {dayContent}
                                        {infoIcon}
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            </AnimatePresence>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {leadTimeNotice ? (
                            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>{leadTimeNotice}</span>
                            </div>
                          ) : null}
                          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700">
                            No hay fechas disponibles para reserva en este momento. Probá más adelante o consultanos por
                            WhatsApp.
                          </div>
                        </div>
                      )}

                      <div className="mt-6 border-t border-neutral-100 pt-4">
                        <AnimatePresence mode="wait" initial={false}>
                          {selectedDate ? (
                            <motion.div
                              key="calendar-selection"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                            >
                              <div className="flex items-end justify-between gap-3">
                                <div>
                                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                                    Salida elegida
                                  </div>
                                  <div className="mt-1 text-[15px] font-bold capitalize tracking-[-0.01em] text-neutral-900">
                                    {formatDateLabel(selectedDate)}
                                  </div>
                                </div>
                                {selectedAvailability ? (
                                  <div className="text-right">
                                    <div className="text-[15px] font-bold tracking-[-0.01em] text-neutral-900">
                                      {getSalidaForDate(selectedDate)?.moneda || paquete.moneda || 'ARS'} $
                                      {Number(getSalidaForDate(selectedDate)?.precio ?? paquete.precio ?? 0).toLocaleString('es-AR')}
                                    </div>
                                    <div className="text-[11px] font-medium text-neutral-400">por persona</div>
                                  </div>
                                ) : null}
                              </div>
                            </motion.div>
                          ) : (
                            <motion.p
                              key="calendar-hint"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="text-center text-[13px] text-neutral-400"
                            >
                              Elegí una fecha del calendario para continuar
                            </motion.p>
                          )}
                        </AnimatePresence>

                        {hasAddons ? (
                          <button
                            type="button"
                            onClick={goToAddons}
                            disabled={!selectedDate}
                            className="group mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 text-[15px] font-semibold tracking-[-0.01em] text-white transition-all duration-300 hover:bg-neutral-700 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-30"
                          >
                            Continuar
                            <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                          </button>
                        ) : (
                          <Link
                            href={bookingHref}
                            aria-disabled={!selectedDate}
                            onClick={(event) => {
                              if (!selectedDate) event.preventDefault();
                            }}
                            className={`group mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold tracking-[-0.01em] transition-all duration-300 active:scale-[0.98] ${selectedDate
                              ? 'bg-neutral-900 text-white hover:bg-neutral-700'
                              : 'pointer-events-none bg-neutral-200 text-white'
                              }`}
                          >
                            Reservar
                            <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="modal-addons"
                      custom={modalDirection}
                      variants={modalSlideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={MODAL_SPRING}
                    >
                      <BookingAddonsStep
                        addons={addonOptions}
                        selectedIds={selectedAddonIds}
                        onToggle={toggleAddon}
                        currencyLabel={addonCurrencyLabel}
                      />

                      <div className="mt-6 border-t border-neutral-100 pt-4">
                        {selectedAddonsTotal > 0 ? (
                          <div className="mb-4 flex items-end justify-between gap-3">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">
                                Total adicionales
                              </div>
                              <div className="mt-1 text-[13px] font-medium text-neutral-500">
                                {selectedAddonIds.length} {selectedAddonIds.length === 1 ? 'elegido' : 'elegidos'}
                              </div>
                            </div>
                            <div className="text-right text-[15px] font-bold tracking-[-0.01em] text-neutral-900">
                              + {addonCurrencyLabel} ${selectedAddonsTotal.toLocaleString('es-AR')}
                            </div>
                          </div>
                        ) : (
                          <p className="mb-4 text-center text-[13px] text-neutral-400">
                            Podés reservar sin adicionales o tocar una tarjeta para sumarla.
                          </p>
                        )}

                        <div className="grid grid-cols-[auto_1fr] items-center gap-2">
                          <button
                            type="button"
                            onClick={backToCalendar}
                            className="group flex h-12 items-center justify-center gap-1.5 rounded-full border border-neutral-200 px-4 text-[13px] font-semibold text-neutral-500 transition-all duration-300 hover:border-neutral-300 hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.98]"
                          >
                            <ChevronLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
                            <span className="hidden sm:inline">Volver a la fecha</span>
                            <span className="sm:hidden">Volver</span>
                          </button>
                          <Link
                            href={bookingHref}
                            className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-neutral-900 text-[15px] font-semibold tracking-[-0.01em] text-white transition-all duration-300 hover:bg-neutral-700 active:scale-[0.98]"
                          >
                            Reservar
                            <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {tooltipInfo.visible && (
        <div
          className="fixed z-50 w-64 rounded-2xl border border-[#D4E6F7] bg-white p-4 shadow-[0_16px_36px_rgba(15,66,116,0.12)]"
          style={{ left: Math.min(tooltipInfo.x, typeof window !== 'undefined' ? window.innerWidth - 280 : 400), top: tooltipInfo.y + 16 }}
          onClick={() => setTooltipInfo({ visible: false, x: 0, y: 0, date: '' })}
        >
          <div className="flex items-start gap-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <div>
              <p className="text-sm font-semibold text-[#0B2240]">Para reservar días próximos</p>
              <p className="mt-1 text-sm text-[#5A7898]">Comunicate con nosotros</p>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#2BB8BF] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#22A9B0]"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
