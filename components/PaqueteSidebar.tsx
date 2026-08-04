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
  const specialPrice = Number(paquete.precioDescuentoPrimerosCupos ?? 0);
  const specialDeadline = formatPromoDeadline(paquete.tarifaEspecialFechaLimite);
  const specialDeadlineDate = parsePromoDeadline(paquete.tarifaEspecialFechaLimite);
  const hasSpecialPrice =
    specialPrice > 0 &&
    paquete.precio > 0 &&
    specialPrice < paquete.precio &&
    Boolean(specialDeadline) &&
    Boolean(specialDeadlineDate && specialDeadlineDate.getTime() >= Date.now());
  const [step, setStep] = useState<'calendar' | 'people'>('calendar');
  const [selectedDate, setSelectedDate] = useState('');
  const [people, setPeople] = useState(1);
  const whatsappHref = useMemo(() => getWhatsAppLinkForPackage(paquete.titulo), [paquete.titulo]);
  const paymentMethods = ['VISA', 'mastercard', 'NARANJA', 'mercado pago'];

  const visibleBookingDates = useMemo(
    () => filterAvailabilityToBookingWindow(bookingDates, new Date()).sort((a, b) => a.date.localeCompare(b.date)),
    [bookingDates]
  );

  const firstAvailableDate = useMemo(
    () => visibleBookingDates.find((item) => item.available > 0)?.date || '',
    [visibleBookingDates]
  );

  const selectedAvailability = useMemo(
    () => visibleBookingDates.find((item) => item.date === selectedDate) ?? null,
    [selectedDate, visibleBookingDates]
  );

  const maxSelectablePeople = getMaxSelectablePeople(selectedAvailability?.available ?? 0, maxPeoplePerBooking);

  useEffect(() => {
    if (!selectedDate && firstAvailableDate) {
      setSelectedDate(firstAvailableDate);
    }
  }, [firstAvailableDate, selectedDate]);

  useEffect(() => {
    if (maxSelectablePeople <= 0) {
      setPeople(1);
      return;
    }
    if (people > maxSelectablePeople) {
      setPeople(maxSelectablePeople);
    }
  }, [maxSelectablePeople, people]);

  const bookingHref = `/checkout?slug=${encodeURIComponent(paquete.slug)}&date=${encodeURIComponent(
    selectedDate || 'sin-fecha'
  )}&people=${encodeURIComponent(String(people))}`;

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
              {step === 'calendar' ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-base font-extrabold text-[#0D223F]">Elegí tu fecha</div>
                  </div>

                  {visibleBookingDates.length > 0 ? (
                    <div className="space-y-3">
                      {months.map(({ year, month }) => {
                        const cells = buildBookingCalendarMonth({
                          year,
                          month,
                          entries: visibleBookingDates,
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
                                      onClick={() => {
                                        setSelectedDate(cell.isoDate);
                                        setStep('people');
                                      }}
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
                    <div className="rounded-2xl border border-dashed border-[#C7DBEE] bg-[#F8FBFF] px-4 py-6 text-center">
                      <div className="text-sm font-semibold text-[#0D223F]">Próximamente nuevas fechas</div>
                      <p className="mt-1 text-xs text-slate-500">Consultanos y te avisamos apenas se habiliten.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-extrabold text-[#0D223F]">Cantidad de personas</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep('calendar')}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#2BB8BF] transition hover:text-[#1C9FA6]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Cambiar fecha
                    </button>
                  </div>

                  <div className="rounded-2xl border border-[#D6E8F7] bg-[#F8FBFF] px-4 py-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha seleccionada</div>
                    <div className="mt-1 text-sm font-bold text-[#0D223F]">{formatDateLabel(selectedDate)}</div>
                    {selectedAvailability ? (
                      <div className="mt-2 text-xs text-slate-600">
                        Cupos disponibles: <span className="font-bold text-[#166534]">{selectedAvailability.available}</span>
                        {selectedAvailability.capacity > 0 ? ` de ${selectedAvailability.capacity}` : ''}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[#D6E8F7] bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <Users className="h-4 w-4 text-[#2BB8BF]" />
                      Personas
                    </div>

                    {maxSelectablePeople > 0 ? (
                      <>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setPeople((current) => Math.max(1, current - 1))}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C7DBEE] bg-[#F8FBFF] text-xl font-bold text-[#0D223F] transition hover:bg-white"
                            aria-label="Restar persona"
                          >
                            -
                          </button>
                          <div className="min-w-[96px] text-center">
                            <div className="text-[28px] font-black text-[#0D223F]">{people}</div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">personas</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPeople((current) => Math.min(maxSelectablePeople, current + 1))}
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#C7DBEE] bg-[#F8FBFF] text-xl font-bold text-[#0D223F] transition hover:bg-white"
                            aria-label="Sumar persona"
                          >
                            +
                          </button>
                        </div>

                        <div className="mt-3 rounded-2xl bg-[#F8FBFF] px-4 py-3 text-sm text-slate-600">
                          Podés reservar hasta <span className="font-bold text-[#0D223F]">{maxSelectablePeople}</span>{' '}
                          {maxSelectablePeople === 1 ? 'persona' : 'personas'} en esta operación.
                        </div>

                        <Link
                          href={bookingHref}
                          className="mt-4 flex h-11 w-full items-center justify-center rounded-2xl bg-[#F6C000] font-extrabold text-[#082032] transition hover:bg-[#E9B400] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F6C000]/35 focus-visible:ring-offset-2 active:bg-[#DCA900]"
                        >
                          Continuar al checkout
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Link>
                      </>
                    ) : (
                      <div className="mt-3 rounded-2xl border border-[#F2D5DB] bg-[#FFF5F7] px-4 py-3 text-sm font-semibold text-[#9F1239]">
                        La fecha seleccionada se quedó sin cupo. Volvé al calendario y elegí otra opción.
                      </div>
                    )}
                  </div>
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
              <span>Elegís fecha con disponibilidad real antes de avanzar</span>
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
