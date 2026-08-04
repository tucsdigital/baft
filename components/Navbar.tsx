'use client';

import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Briefcase, MapPin, Compass, Phone, Mail, Search, MessageCircle, Loader2 } from 'lucide-react';
import { FaFacebook, FaInstagram } from 'react-icons/fa';
import { SITE_NAME, CONTACT_INFO, SOCIAL_MEDIA } from '@/lib/constants';
import { getBrandLogoSrc, isRemoteUrl, renderTemplate, siteConfig } from '@/lib/siteConfig';
import { getWhatsAppLink } from '@/lib/utils/whatsapp';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface NavbarProps {
  transparent?: boolean;
  forceTransparent?: boolean;
  reserveSpace?: boolean;
  /** Estética Río / Viaggio Tur: fondo claro, texto negro */
  theme?: "default" | "rio";
  variant?: "default" | "homeMockup";
}

type ReservationLookupResult = {
  id: string;
  code: string;
  packageTitle: string;
  packageSlug: string | null;
  departureDate: string;
  people: number;
  paymentStatusLabel: string;
};

function formatReservationLookupDate(date: string): string {
  if (!date || date === 'sin-fecha') return 'Salida a coordinar';
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return date;
  }
}

function ReservationLookupLoading() {
  return (
    <div className="rounded-2xl border border-[#D7EEF0] bg-[#F5FBFC] px-4 py-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#2BB8BF]" />
        <div className="text-sm font-semibold text-[#072852]">Buscando tu reserva...</div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-4 w-2/3 animate-pulse rounded-full bg-[#DCEBFA]" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-[#E4F0FB]" />
        <div className="h-4 w-1/2 animate-pulse rounded-full bg-[#DCEBFA]" />
      </div>
    </div>
  );
}

function ReservationLookupResultCard({
  result,
  onClose,
}: {
  result: ReservationLookupResult;
  onClose: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[#D7EEF0] bg-[#F8FEFE] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-black tracking-[-0.01em] text-[#072852]">{result.packageTitle}</div>
          <div className="mt-1 text-xs text-[#52708E]">
            {formatReservationLookupDate(result.departureDate)} · {result.people} pasajero(s)
          </div>
        </div>
        <div className="shrink-0 rounded-full bg-[#2BB8BF]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#12858B]">
          {result.paymentStatusLabel}
        </div>
      </div>

      <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs text-[#36506B]">
        <span className="font-bold uppercase tracking-[0.12em] text-[#7D98B1]">C{String.fromCharCode(243)}digo:</span>{' '}
        <span className="font-mono text-[11px] text-[#072852]">{result.code}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        <Link
          href={`/consultar-reserva?code=${encodeURIComponent(result.code)}`}
          className="rounded-full bg-[#2BB8BF] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#22A9B0]"
          onClick={onClose}
        >
          Ver detalle
        </Link>
        {result.packageSlug ? (
          <Link
            href={`/excursion/${result.packageSlug}`}
            className="rounded-full border border-[#BDE5E7] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#12858B] transition hover:bg-[#F3FEFE]"
            onClick={onClose}
          >
            Ver excursión
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function Navbar({ transparent = false, forceTransparent = false, reserveSpace = false, theme = "default", variant = "default" }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reservationLookupQuery, setReservationLookupQuery] = useState('');
  const [reservationLookupResults, setReservationLookupResults] = useState<ReservationLookupResult[]>([]);
  const [reservationLookupLoading, setReservationLookupLoading] = useState(false);
  const [reservationLookupError, setReservationLookupError] = useState<string | null>(null);
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [reservationModalState, setReservationModalState] = useState<'idle' | 'loading' | 'success' | 'empty' | 'error'>('idle');
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const logoSrc = getBrandLogoSrc();
  const logoAlt = renderTemplate(siteConfig.branding.logo.altTextTemplate || '{{siteName}} Logo');
  const telefonos = [CONTACT_INFO.telefono, CONTACT_INFO.telefonoSecundario].filter(Boolean).join(' / ');
  const whatsAppHref = getWhatsAppLink();
  const navRef = useRef<HTMLElement | null>(null);
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const original = document.body.style.overflow;
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = original;
    }
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileMenuOpen]);

  const isRio = theme === "rio";
  const isCompact = isRio && (isScrolled || mobileMenuOpen);
  const isHomeMockup = variant === "homeMockup";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!reserveSpace) return;
    if (typeof window === 'undefined') return;

    const updateHeight = () => {
      const height = navRef.current?.getBoundingClientRect().height ?? 0;
      setNavHeight(height);
    };

    updateHeight();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateHeight) : null;
    if (ro && navRef.current) ro.observe(navRef.current);

    window.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
      ro?.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (!reserveSpace) return;
    const height = navRef.current?.getBoundingClientRect().height ?? 0;
    setNavHeight(height);
  }, [isScrolled, mobileMenuOpen, reserveSpace]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/excursiones?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const reservationCode = reservationLookupQuery.trim().toUpperCase();

  const submitReservationLookup = async () => {
    const code = reservationCode;
    if (!code || code.length < 4) {
      setReservationLookupResults([]);
      setReservationLookupError(null);
      setReservationModalState('empty');
      setReservationModalOpen(true);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setReservationLookupLoading(true);
    setReservationLookupError(null);
    setReservationLookupResults([]);
    setReservationModalState('loading');
    setReservationModalOpen(true);

    try {
      const res = await fetch(`/api/reservas/by-code?code=${encodeURIComponent(code)}`, {
        method: 'GET',
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'No se pudo consultar.');
      }
      const list = Array.isArray(json.results) ? (json.results as ReservationLookupResult[]) : [];
      if (!controller.signal.aborted) {
        setReservationLookupResults(list);
        setReservationModalState(list.length > 0 ? 'success' : 'empty');
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setReservationLookupError(
        error instanceof Error && error.message ? error.message : 'No pudimos buscar la reserva en este momento.'
      );
      setReservationModalState('error');
    } finally {
      if (!controller.signal.aborted) {
        setReservationLookupLoading(false);
      }
    }
  };

  const reservationLookupDesktop = (
    <div className="relative hidden lg:block">
      <form
        className="flex items-center rounded-full border border-white/20 bg-white/14 pl-4 pr-1.5 py-1.5 backdrop-blur-md"
        onSubmit={(event) => {
          event.preventDefault();
          void submitReservationLookup();
        }}
      >
        <Search className="mr-2 h-4 w-4 shrink-0 text-white/80" />
        <div className="w-[140px]">
          <input
            type="text"
            inputMode="text"
            placeholder="N° reserva"
            className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-white/70"
            value={reservationLookupQuery}
            onChange={(event) =>
              setReservationLookupQuery(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9-]/g, '')
                  .slice(0, 40)
              )
            }
          />
        </div>
        <button
          type="submit"
          className="ml-3 rounded-full bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#12858B] transition hover:bg-[#F3FEFE]"
          aria-label="Buscar mi reserva"
        >
          {reservationLookupLoading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Buscando
            </span>
          ) : (
            'Buscar mi reserva'
          )}
        </button>
      </form>
    </div>
  );

  const reservationLookupMobile = (
    <div className="space-y-3 rounded-[24px] border border-[#BDE5E7] bg-[#F5FBFC] p-4">
      <form
        className="flex items-center rounded-2xl border border-[#D7EEF0] bg-white px-4 py-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          setMobileMenuOpen(false);
          void submitReservationLookup();
        }}
      >
        <Search className="mr-2 h-4 w-4 shrink-0 text-[#2BB8BF]" />
        <input
          type="text"
          inputMode="text"
          placeholder="N° reserva"
          className="w-full bg-transparent text-sm font-medium text-[#072852] outline-none placeholder:text-[#7C95AE]"
          value={reservationLookupQuery}
          onChange={(event) =>
            setReservationLookupQuery(
              event.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9-]/g, '')
                .slice(0, 40)
            )
          }
        />
        <button
          type="submit"
          className="ml-3 rounded-full bg-[#2BB8BF] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white"
          aria-label="Buscar mi reserva"
        >
          {reservationLookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
        </button>
      </form>
    </div>
  );

  const navContent = isHomeMockup ? (
    <nav
      ref={navRef as unknown as React.RefObject<HTMLElement>}
      className={`fixed left-0 right-0 top-0 z-[100] transition-all duration-500 ${isScrolled ? 'pt-2 md:pt-4' : 'pt-0'}`}
      onClick={() => {
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }}
    >
      <div className={`overflow-hidden bg-primary transition-all duration-500 ${isScrolled ? 'h-0 opacity-0' : 'h-10 opacity-100'}`}>
        <div className="container mx-auto flex h-10 items-center justify-between px-4 py-0 text-[11px] font-medium text-white/90 md:px-6 lg:px-8">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              {SOCIAL_MEDIA.facebook ? (
                <Link href={SOCIAL_MEDIA.facebook} target="_blank" className="text-white transition hover:text-white">
                  <FaFacebook className="h-3.5 w-3.5 opacity-80" />
                </Link>
              ) : null}
              <span className="text-white/30">|</span>
              {SOCIAL_MEDIA.instagram ? (
                <Link href={SOCIAL_MEDIA.instagram} target="_blank" className="text-white transition hover:text-white">
                  <FaInstagram className="h-3.5 w-3.5 opacity-80" />
                </Link>
              ) : null}
              <span className="text-white/30">|</span>
            </div>
            <div className="flex items-center space-x-2">
              <Phone className="h-3.5 w-3.5 opacity-80" />
              <span className="tracking-wide">{telefonos}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-3.5 w-3.5 opacity-80" />
              <span className="tracking-wide">{CONTACT_INFO.whatsappDisplay}</span>
            </div>
            <div className="flex items-center space-x-2 hover:text-white transition cursor-pointer">
              <Mail className="h-3.5 w-3.5 opacity-80" />
              <a href={SOCIAL_MEDIA.email} target="_blank" className="text-xs text-white transition hover:text-white">
                {CONTACT_INFO.email}
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className={`mx-auto w-full transition-all duration-500 ${isScrolled ? 'mt-2 px-4 md:px-6' : 'bg-white'}`}>
        <div
          className={`mx-auto transition-all duration-500 ${
            isScrolled
              ? 'xl:max-w-7xl rounded-2xl bg-white/90 px-4 shadow-lg backdrop-blur-xl md:px-6'
              : 'container border-none px-4 shadow-none md:px-6 lg:px-8'
          }`}
        >
          <div className="flex h-16 items-center justify-between md:h-24">
            <Link href="/" className="flex items-center shrink-0">
              <div className="flex h-12 items-center shrink-0 md:h-16">
                {isRemoteUrl(logoSrc) ? (
                  <img src={logoSrc} alt={logoAlt} className="h-full w-auto object-contain" />
                ) : (
                  <Image src={logoSrc} alt={logoAlt} width={192} height={64} className="h-full w-auto object-contain" />
                )}
              </div>
            </Link>

            <div className="hidden flex-1 items-center justify-center mx-4 text-[11px] font-semibold tracking-[0.08em] text-gray-500 lg:flex xl:text-[12px]">
              <div className="flex items-center space-x-5">
                <Link href="/" className="uppercase transition-colors hover:text-primary">Inicio</Link>
                <Link href="/#destinos" className="uppercase transition-colors hover:text-primary">Destinos</Link>
                <Link href="/excursiones" className="uppercase transition-colors hover:text-primary">Excursiones</Link>
                <Link href="/#contacto" className="uppercase transition-colors hover:text-primary">Contacto</Link>
              </div>
            </div>

            <a
              href={whatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#1EBE57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#25D366] active:bg-[#17A34A] lg:inline-flex xl:px-5 xl:text-sm"
            >
              <Phone className="h-4 w-4" />
              Consultá ahora
            </a>

            <button
              className="ml-auto p-2 lg:hidden"
              onClick={(event) => {
                event.stopPropagation();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="h-6 w-6 text-gray-900" /> : <Menu className="h-6 w-6 text-gray-900" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[110] lg:hidden"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed right-0 top-0 bottom-0 z-10 w-[86vw] max-w-sm shadow-2xl bg-white overflow-y-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative h-full flex flex-col p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-gray-500 font-bold">Menú</div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 bg-gray-100 rounded-full" aria-label="Cerrar menú">
                    <X className="w-5 h-5 text-gray-900" />
                  </button>
                </div>

                <nav className="flex-1 space-y-1 text-left">
                  <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                    Inicio
                  </Link>
                  <Link href="/#destinos" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                    Destinos
                  </Link>
                  <Link href="/excursiones" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                    Excursiones
                  </Link>
                  <Link href="/#contacto" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 hover:text-primary" onClick={() => setMobileMenuOpen(false)}>
                    Contacto
                  </Link>
                </nav>
                <a
                  href={whatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1EBE57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/30 focus-visible:ring-offset-2 active:bg-[#17A34A]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Phone className="h-4 w-4" />
                  Consultá ahora
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  ) : (
    <nav
      ref={navRef as unknown as React.RefObject<HTMLElement>}
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${isScrolled ? 'pt-2 md:pt-4' : 'pt-0'}`}
      onClick={() => {
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }}
    >
      {/* Topbar (Se oculta al scrollear para diseño más limpio) */}
      <div className={`overflow-hidden bg-[#2BB8BF] transition-all duration-500 ${isScrolled ? 'h-0 opacity-0' : 'h-10 opacity-100'}`}>
        <div className="container mx-auto px-4 md:px-6 lg:px-8 text-white/90 items-center justify-between py-0 text-[11px] font-medium h-10 flex">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Phone className="w-3.5 h-3.5 opacity-80" />
              <span className="tracking-wide">{telefonos}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-3.5 h-3.5 opacity-80" />
              <span className="tracking-wide">{CONTACT_INFO.whatsappDisplay}</span>
            </div>
            <div className="flex items-center space-x-2 hover:text-white transition cursor-pointer">
              <Mail className="w-3.5 h-3.5 opacity-80" />
              <a href={SOCIAL_MEDIA.email} className="tracking-wide">
                {CONTACT_INFO.email}
              </a>
            </div>
          </div>

          <div className="flex items-stretch h-full">
            <Link href="/agencias" className="bg-black/10 hover:bg-black/20 text-white px-8 flex items-center transition-all duration-300 font-bold tracking-[0.15em] text-[10px]">
              AGENCIAS
            </Link>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className={`mx-auto transition-all duration-500 w-full ${
        isScrolled 
          ? 'px-4 md:px-6 mt-2' 
          : 'bg-[#2BB8BF]'
      }`}>
        <div className={`mx-auto transition-all duration-500 ${
          isScrolled 
            ? 'xl:max-w-7xl rounded-[28px] border border-white/15 bg-[#2BB8BF]/95 px-4 md:px-6 shadow-[0_18px_50px_rgba(7,40,82,0.18)] backdrop-blur-xl'
            : 'container border-none bg-[#2BB8BF] px-4 shadow-none md:px-6 lg:px-8'
        }`}>
          <div className="flex items-center justify-between h-16 md:h-24">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0 gap-1">
            <div className="h-12 md:h-16 flex items-center shrink-0">
              {isRemoteUrl(logoSrc) ? (
                <img
                  src={logoSrc}
                  alt={logoAlt}
                  className="h-full w-auto object-contain"
                />
              ) : (
                <Image
                  src={logoSrc}
                  alt={logoAlt}
                  width={192}
                  height={64}
                  className="h-full w-auto object-contain"
                />
              )}
            </div>
            <span className="font-logo text-2xl leading-none whitespace-nowrap text-white">
              {siteConfig.branding.logo.titleText}
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex flex-1 mx-4 flex-col items-center justify-center space-y-1.5 text-[10px] font-semibold tracking-[0.1em] text-white xl:text-[12px]">
            <div className="flex items-center space-x-3">
              <Link href="/#destinos" className="uppercase text-white transition-colors hover:text-white/85">DESTINOS</Link>
              <span className="font-light text-white/35">|</span>
              <Link href="/excursiones?tipo=grupal" className="uppercase text-white transition-colors hover:text-white/85">SALIDAS GRUPALES</Link>
              <span className="font-light text-white/35">|</span>
              <Link href="/excursiones?tipo=internacional" className="uppercase text-white transition-colors hover:text-white/85">INTERNACIONALES</Link>
              <span className="font-light text-white/35">|</span>
              <Link href="/educativos" className="uppercase text-white transition-colors hover:text-white/85">EDUCATIVOS</Link>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/transportes" className="uppercase text-white transition-colors hover:text-white/85">TRANSPORTE</Link>
              <span className="font-light text-white/35">|</span>
              <Link href="/excursiones?tag=escapada,religioso" className="uppercase text-white transition-colors hover:text-white/85">EVENTOS/RECITALES</Link>
              <span className="font-light text-white/35">|</span>
              <Link href="/excursiones?tag=promo" className="uppercase text-white transition-colors hover:text-white/85">PROMOS</Link>
              <span className="font-light text-white/35">|</span>
              <Link href="/contacto" className="uppercase text-white transition-colors hover:text-white/85">CONTACTO</Link>
              <span className="font-light text-white/35">|</span>
              {reservationLookupDesktop}
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="group ml-auto hidden w-48 shrink-0 items-center rounded-full border border-white/15 bg-white px-5 py-2.5 transition-all duration-300 hover:bg-white/95 focus-within:ring-2 focus-within:ring-white/25 2xl:w-64 lg:flex">
            <Search className="mr-2.5 h-4 w-4 shrink-0 text-[#2BB8BF] transition-colors" />
            <input 
              type="text" 
              placeholder="Buscá tu destino!" 
              className="w-full bg-transparent text-xs font-medium text-[#072852] outline-none placeholder:text-[#7C95AE]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 ml-auto"
            onClick={(event) => {
              event.stopPropagation();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[110] lg:hidden"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="fixed right-0 top-0 bottom-0 z-10 w-[86vw] max-w-sm shadow-2xl bg-white overflow-y-auto"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative h-full flex flex-col p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-gray-500 font-bold">Menú</div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 bg-gray-100 rounded-full">
                    <X className="w-5 h-5 text-gray-900" />
                  </button>
                </div>

                {reservationLookupMobile}

                <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-xl px-4 py-3 w-full border border-transparent focus-within:border-primary focus-within:bg-white transition mb-6">
                  <Search className="w-5 h-5 text-gray-400 mr-3 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Buscá tu destino!" 
                    className="bg-transparent outline-none text-base w-full text-gray-800 placeholder-gray-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>

                <nav className="space-y-1 text-left flex-1">
                  <Link href="/#destinos" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:text-primary transition" onClick={() => setMobileMenuOpen(false)}>
                    DESTINOS
                  </Link>
                  <Link href="/excursiones?tipo=grupal" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:text-primary transition" onClick={() => setMobileMenuOpen(false)}>
                    SALIDAS GRUPALES
                  </Link>
                  <Link href="/excursiones?tipo=internacional" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:text-primary transition" onClick={() => setMobileMenuOpen(false)}>
                    INTERNACIONALES
                  </Link>
                  <Link href="/educativos" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:text-primary transition" onClick={() => setMobileMenuOpen(false)}>
                    EDUCATIVOS
                  </Link>
                  <Link href="/transportes" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:text-primary transition" onClick={() => setMobileMenuOpen(false)}>
                    TRANSPORTE
                  </Link>
                  <Link href="/excursiones?tag=escapada,religioso" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:text-primary transition" onClick={() => setMobileMenuOpen(false)}>
                    EVENTOS/RECITALES
                  </Link>
                  <Link href="/excursiones?tag=promo" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:text-primary transition" onClick={() => setMobileMenuOpen(false)}>
                    PROMOS
                  </Link>
                  <Link href="/contacto" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 hover:text-primary transition" onClick={() => setMobileMenuOpen(false)}>
                    CONTACTO
                  </Link>
                </nav>

                <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col space-y-4">
                  <Link href="/agencias" className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl text-center text-sm transition font-bold tracking-wider">
                    AGENCIAS
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );

  return (
    <>
      {reserveSpace && (
        <div aria-hidden className="w-full transition-[height] duration-500" style={{ height: navHeight }} />
      )}
      {mounted && typeof document !== "undefined"
        ? createPortal(navContent, document.body)
        : navContent}
      <Dialog
        open={reservationModalOpen}
        onOpenChange={(open) => {
          setReservationModalOpen(open);
          if (!open) {
            abortRef.current?.abort();
            setReservationLookupLoading(false);
            setReservationLookupError(null);
            setReservationModalState('idle');
          }
        }}
      >
        <DialogContent className="border-[#CDECEF] bg-white/95 backdrop-blur-xl sm:max-w-md">
          <DialogHeader className="text-left">
            <DialogTitle className="text-[#072852]">
              {reservationModalState === 'loading'
                ? 'Buscando tu reserva'
                : reservationModalState === 'success'
                  ? 'Reserva confirmada'
                  : reservationModalState === 'error'
                    ? 'No pudimos buscar tu reserva'
                    : 'Reserva no encontrada'}
            </DialogTitle>
            <DialogDescription className="text-[#52708E]">
              {reservationModalState === 'success'
                ? 'Mostramos tu reserva confirmada según el número ingresado.'
                : reservationModalState === 'empty'
                  ? (reservationCode.length < 4
                      ? 'Ingresá un número de reserva válido para buscar tu reserva confirmada.'
                      : 'No encontramos una reserva confirmada con ese número.')
                  : reservationModalState === 'error'
                    ? (reservationLookupError ?? 'Intentá nuevamente en unos minutos.')
                    : 'Ingresá tu número de reserva y presioná buscar.'}
            </DialogDescription>
          </DialogHeader>

          {reservationModalState === 'loading' ? <ReservationLookupLoading /> : null}

          {reservationModalState === 'success' ? (
            <div className="space-y-3">
              {reservationLookupResults.map((result) => (
                <ReservationLookupResultCard
                  key={result.id}
                  result={result}
                  onClose={() => setReservationModalOpen(false)}
                />
              ))}
            </div>
          ) : null}

          {reservationModalState === 'empty' ? (
            <div className="rounded-2xl border border-[#D7EEF0] bg-[#F5FBFC] px-4 py-4 text-sm text-[#52708E]">
              {reservationCode.length < 4
                ? 'Ingresá tu número de reserva y presioná “Buscar mi reserva”.'
                : 'Verificá que el número esté correcto. Solo se muestran reservas confirmadas (pagadas).'}
            </div>
          ) : null}

          {reservationModalState === 'error' ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {reservationLookupError ?? 'No pudimos buscar tu reserva. Intentá nuevamente.'}
            </div>
          ) : null}

          <DialogFooter className="sm:justify-between">
            <div className="text-xs text-[#7C95AE]">
              {reservationModalState === 'success' ? 'Reserva confirmada' : 'Consulta por número'}
            </div>
            <button
              type="button"
              className="rounded-full bg-[#2BB8BF] px-5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#22A9B0]"
              onClick={() => setReservationModalOpen(false)}
            >
              Cerrar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
