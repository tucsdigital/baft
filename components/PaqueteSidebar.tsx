'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Paquete } from '@/types';
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Headphones, MapPin, ShieldCheck, Users } from 'lucide-react';
import { getWhatsAppLinkForPackage } from '@/lib/utils/whatsapp';
import {
  buildBookingCalendarMonth,
  buildBookingWindowMonths,
  filterAvailabilityToBookingWindow,
  getMaxSelectablePeople,
  type BookingAvailabilityItem,
} from '@/lib/packages/booking-calendar';
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
  const hasSpecialPrice =
    specialPrice > 0 &&
    paquete.precio > 0 &&
    specialPrice < paquete.precio &&
    Boolean(specialDeadline) &&
    Boolean(specialDeadlineDate && specialDeadlineDate.getTime() >= Date.now());
  const [step, setStep] = useState<'people' | 'calendar'>('people');
  const [selectedDate, setSelectedDate] = useState('');
  const [pax, setPax] = useState<PeopleBreakdown>(() =>
    normalizePeopleBreakdown({ breakdown: null, categories: peopleCategories })
  );
  const people = Math.max(1, Math.floor(getPeopleBreakdownTotal(pax)));
  const whatsappHref = useMemo(() => getWhatsAppLinkForPackage(paquete.titulo), [paquete.titulo]);
  const paymentMethods = ['VISA', 'mastercard', 'NARANJA', 'mercado pago'];

  const visibleBookingDates = useMemo(
    () => filterAvailabilityToBookingWindow(bookingDates, new Date()).sort((a, b) => a.date.localeCompare(b.date)),
    [bookingDates]
  );

  const selectedAvailability = useMemo(
    () => visibleBookingDates.find((item) => item.date === selectedDate) ?? null,
    [selectedDate, visibleBookingDates]
  );

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
      setStep('calendar');
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

  const bookingHref = `/checkout?slug=${encodeURIComponent(paquete.slug)}&date=${encodeURIComponent(
    selectedDate || 'sin-fecha'
  )}&people=${encodeURIComponent(String(people))}&pax=${encodeURIComponent(JSON.stringify(pax))}`;

  const months = buildBookingWindowMonths(new Date());

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[#D2E5F6] bg-white p-5 shadow-[0_18px_40px_rgba(14,63,110,0.1)]">
        <div className="flex items-center justify-between gap-2">
          <div className="rounded-full bg-[#E8F7FF] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#0A6E90]">
            Reserva directa
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Precio {paquete.mostrarDesde ? 'desde' : ''} 
          </div>

          {hasSpecialPrice ? (
            <div className="mt-3">
              <div className="flex items-end gap-3 text-[#91A1B2]">
                <div className="text-[22px] font-semibold leading-none line-through decoration-2">
                  ${paquete.precio.toLocaleString('es-AR')}
                </div>
                <div className="mb-0.5 text-xs font-extrabold uppercase">{paquete.moneda || 'ARS'}</div>
              </div>

              <div className="mt-1 flex items-end gap-3">
                <div className="text-[44px] leading-none font-black tracking-[-0.03em] text-[#0D223F]">
                  ${specialPrice.toLocaleString('es-AR')}
                </div>
                <div className="mb-2 text-sm font-extrabold uppercase text-[#0A6E90]">{paquete.moneda || 'ARS'}</div>
              </div>

              <div className="mt-2 text-sm font-semibold text-[#0A7A5A]">Tarifa especial</div>
              <div className="mt-1 text-sm text-[#5A789A]">Vigente hasta el {specialDeadline}</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#91A1B2]">Por persona</div>
            </div>
          ) : (
            <div className="mt-1 flex items-end gap-3">
              <div className="text-[44px] leading-none font-black tracking-[-0.02em] text-[#0D223F]">
                ${paquete.precio.toLocaleString('es-AR')}
              </div>
              <div className="mb-2 text-sm font-extrabold uppercase text-[#5A789A]">{paquete.moneda || 'ARS'}</div>
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
          <div className="rounded-2xl border border-[#D6E8F7] bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EDF8FF]">
                <MapPin className="h-4 w-4 text-[#2BB8BF]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destino</div>
                <div className="truncate text-sm font-bold text-[#0D223F]">{destino}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EDF8FF]">
                <Calendar className="h-4 w-4 text-[#2BB8BF]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha elegida</div>
                <div className="truncate text-sm font-bold text-[#0D223F]">{formatDateLabel(selectedDate)}</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#EDF8FF]">
                <Clock className="h-4 w-4 text-[#2BB8BF]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duración</div>
                <div className="truncate text-sm font-bold text-[#0D223F]">{duracion}</div>
              </div>
            </div>
          </div>

          {bookingEnabled ? (
            <div className="rounded-2xl border border-[#D6E8F7] bg-white p-4">
              {step === 'people' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-extrabold text-[#0D223F]">Cantidad de personas</div>
                    </div>
                    {visibleBookingDates.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setStep('calendar')}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[#2BB8BF] transition hover:text-[#1C9FA6]"
                      >
                        Elegir fecha
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[#D6E8F7] bg-[#F8FBFF] px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha</div>
                    <div className="mt-1 text-sm font-bold text-[#0D223F]">
                      {visibleBookingDates.length > 0 ? 'Elegís la fecha en el siguiente paso' : 'A coordinar'}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#D6E8F7] bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Users className="h-4 w-4 text-[#2BB8BF]" />
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
                            className="flex items-center justify-between gap-3 rounded-2xl border border-[#D6E8F7] bg-[#F8FBFF] px-4 py-3"
                          >
                            <div>
                              <div className="text-sm font-bold text-[#0D223F]">{category.label}</div>
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
                                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7DBEE] bg-white text-lg font-bold text-[#0D223F] transition hover:bg-[#F8FBFF] disabled:opacity-60"
                                aria-label={`Restar ${category.label}`}
                                disabled={!canDecrement}
                              >
                                -
                              </button>
                              <div className="min-w-[42px] text-center text-lg font-black text-[#0D223F]">{value}</div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!canIncrement) return;
                                  setPax((current) => ({
                                    ...current,
                                    [category.key]: Math.min(category.max, (Number(current[category.key] ?? 0) || 0) + 1),
                                  }));
                                }}
                                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#C7DBEE] bg-white text-lg font-bold text-[#0D223F] transition hover:bg-[#F8FBFF] disabled:opacity-60"
                                aria-label={`Sumar ${category.label}`}
                                disabled={!canIncrement}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="rounded-2xl bg-[#F8FBFF] px-4 py-3 text-sm text-slate-600">
                        Total: <span className="font-extrabold text-[#0D223F]">{people}</span> · Máximo por reserva:{' '}
                        <span className="font-extrabold text-[#0D223F]">{maxPeoplePerBooking}</span>
                      </div>
                    </div>

                    {visibleBookingDates.length === 0 ? (
                      <>
                        <Link
                          href={bookingHref}
                          className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl bg-[#F6C000] font-extrabold text-[#082032] transition hover:bg-[#E9B400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F6C000]/35 focus-visible:ring-offset-2 active:bg-[#DCA900]"
                        >
                          Reservar
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-extrabold text-[#0D223F]">Elegí tu fecha</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Disponibilidad para <span className="font-extrabold text-[#0D223F]">{people}</span>{' '}
                        {people === 1 ? 'persona' : 'personas'}.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep('people')}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#2BB8BF] transition hover:text-[#1C9FA6]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Cambiar personas
                    </button>
                  </div>

                  {visibleBookingDates.some((item) => item.available >= people) ? (
                    <div className="space-y-3">
                      {months.map(({ year, month }) => {
                        const cells = buildBookingCalendarMonth({
                          year,
                          month,
                          entries: visibleBookingDates,
                          requiredPeople: people,
                        });

                        return (
                          <div key={`${year}-${month}`} className="rounded-2xl border border-[#D6E8F7] bg-[#F8FBFF] p-3">
                            <div className="mb-3 text-sm font-extrabold capitalize text-[#0D223F]">{formatMonthLabel(year, month)}</div>
                            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-slate-400">
                              {WEEK_DAYS.map((day) => (
                                <div key={`${year}-${month}-${day}`}>{day}</div>
                              ))}
                            </div>
                            <div className="mt-2 grid grid-cols-7 gap-1">
                              {cells.map((cell) => {
                                const isSelected = selectedDate === cell.isoDate;
                                const sharedClasses =
                                  'flex h-10 w-full items-center justify-center rounded-xl text-sm font-bold transition';

                                if (!cell.inMonth) {
                                  return <div key={cell.isoDate} className={`${sharedClasses} opacity-0`} aria-hidden="true" />;
                                }

                                if (cell.isSelectable) {
                                  return (
                                    <button
                                      key={cell.isoDate}
                                      type="button"
                                      onClick={() => setSelectedDate(cell.isoDate)}
                                      className={`${sharedClasses} ${
                                        isSelected
                                          ? 'bg-[#0D223F] text-white'
                                          : 'bg-[#E8FFF1] text-[#166534] hover:bg-[#D2F8E0]'
                                      }`}
                                      aria-label={`Seleccionar ${formatDateLabel(cell.isoDate)}. ${cell.available} cupos disponibles.`}
                                    >
                                      {cell.day}
                                    </button>
                                  );
                                }

                                return (
                                  <div
                                    key={cell.isoDate}
                                    className={`${sharedClasses} ${
                                      cell.isSoldOut ? 'bg-[#FFF1F2] text-[#BE123C]' : 'bg-[#F1F5F9] text-slate-400'
                                    }`}
                                    aria-label={cell.isSoldOut ? `${cell.day} agotado` : `${cell.day} sin salida`}
                                  >
                                    {cell.day}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#F2D5DB] bg-[#FFF5F7] px-4 py-4 text-sm font-semibold text-[#9F1239]">
                      No hay fechas con cupo para {people} {people === 1 ? 'persona' : 'personas'}. Probá bajar la cantidad.
                    </div>
                  )}

                  {selectedDate ? (
                    <>
                      <div className="rounded-2xl border border-[#D6E8F7] bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha seleccionada</div>
                        <div className="mt-1 text-sm font-bold text-[#0D223F]">{formatDateLabel(selectedDate)}</div>
                        {selectedAvailability ? (
                          <div className="mt-2 text-xs text-slate-600">
                            Cupos disponibles: <span className="font-bold text-[#166534]">{selectedAvailability.available}</span>
                            {selectedAvailability.capacity > 0 ? ` de ${selectedAvailability.capacity}` : ''}
                          </div>
                        ) : null}
                      </div>

                      <Link
                        href={bookingHref}
                        className="flex h-11 w-full items-center justify-center rounded-2xl bg-[#F6C000] font-extrabold text-[#082032] transition hover:bg-[#E9B400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F6C000]/35 focus-visible:ring-offset-2 active:bg-[#DCA900]"
                      >
                        Reservar
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#D6E8F7] bg-white p-4 text-sm text-slate-700">
              Las reservas online no están habilitadas para esta experiencia en este momento.
            </div>
          )}

          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 w-full items-center justify-center rounded-2xl border border-[#11B58D] bg-white font-bold text-[#0E9D79] transition hover:bg-[#F2FFFA]"
          >
            Consultar por WhatsApp
          </a>

          <div className="space-y-2 rounded-2xl border border-[#D6E8F7] bg-white p-4 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#16A34A]" />
              <span>{visibleBookingDates.length > 0 ? 'Elegís fecha con disponibilidad real antes de avanzar' : 'Reservás sin fecha y coordinamos la salida'}</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#16A34A]" />
              <span>Validás la cantidad de personas según cupo y máximo permitido</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#16A34A]" />
              <span>Completás el pago directo en checkout</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#D2E5F6] bg-white p-5 shadow-[0_14px_30px_rgba(15,66,116,0.08)]">
        <div className="text-sm font-bold text-[#0D223F]">¿Tenés dudas?</div>
        <div className="mt-2 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAF6FF]">
            <Headphones className="h-5 w-5 text-[#2BB8BF]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm text-slate-700">Nuestro equipo te asesora de forma personalizada.</div>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[#2BB8BF] hover:underline">
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#D2E5F6] bg-white p-5 shadow-[0_14px_30px_rgba(15,66,116,0.08)]">
        <div className="flex items-center gap-2 text-sm font-bold text-[#0D223F]">
          <ShieldCheck className="h-4 w-4 text-[#12A7C7]" />
          Comprás tranquila
        </div>
        <p className="mt-1 text-xs text-slate-600">Tu compra está protegida</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {paymentMethods.map((method) => (
            <span key={method} className="rounded-lg border border-[#D5E6F5] bg-[#F8FBFF] px-2.5 py-1 text-[10px] font-bold uppercase text-[#4B6A8A]">
              {method}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
