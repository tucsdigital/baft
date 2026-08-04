'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Menu, Phone, X } from 'lucide-react';
import { renderTemplate, siteConfig } from '@/lib/siteConfig';
import { getWhatsAppLink } from '@/lib/utils/whatsapp';

interface NavbarProps {
  transparent?: boolean;
  forceTransparent?: boolean;
  reserveSpace?: boolean;
  floating?: boolean;
  theme?: 'default' | 'rio';
  variant?: 'default' | 'homeMockup';
}

type DestinoNavItem = {
  id: string;
  nombre: string;
  slug: string;
  descripcion?: string;
  imagen?: string;
};

function clampText(value: string, max = 64): string {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function getDestinoSubtitle(item: DestinoNavItem): string {
  const desc = clampText(item.descripcion || '', 58);
  return desc || 'Ver destino';
}

export default function Navbar({
  transparent = false,
  forceTransparent = false,
  reserveSpace = false,
  floating = false,
  variant = 'default',
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [destinosOpen, setDestinosOpen] = useState(false);
  const [destinosMobileOpen, setDestinosMobileOpen] = useState(false);
  const [destinos, setDestinos] = useState<DestinoNavItem[]>([]);
  const [mounted, setMounted] = useState(false);

  const logoAlt = renderTemplate(siteConfig.branding.logo.altTextTemplate || '{{siteName}} Logo');
  const whatsAppHref = getWhatsAppLink();
  const isFloatingVariant = floating;

  const navRef = useRef<HTMLElement | null>(null);
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : original;
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileMenuOpen]);

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
  }, [reserveSpace]);

  useEffect(() => {
    const storageKey = 'baft_nav_destinos_v1';
    const storageAtKey = 'baft_nav_destinos_at_v1';
    const now = Date.now();
    const maxAgeMs = 6 * 60 * 60 * 1000;

    try {
      const cachedAt = Number(sessionStorage.getItem(storageAtKey) || 0);
      const cached = sessionStorage.getItem(storageKey);
      if (cached && cachedAt && now - cachedAt < maxAgeMs) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          setDestinos(parsed);
          return;
        }
      }
    } catch {}

    void (async () => {
      const res = await fetch('/api/destinos', { method: 'GET' }).catch(() => null);
      if (!res || !res.ok) return;
      const json = await res.json().catch(() => null);
      const list = Array.isArray(json?.destinos) ? (json.destinos as DestinoNavItem[]) : [];
      setDestinos(list);
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(list));
        sessionStorage.setItem(storageAtKey, String(now));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!destinosOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDestinosOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [destinosOpen]);

  const destinosItems = useMemo(() => destinos.filter((d) => Boolean(d?.slug)).slice(0, 6), [destinos]);

  const isTransparent = forceTransparent || ((transparent || floating) && !isScrolled);
  const logoSrc = '/images/logo_white.png';
  const logoToneClass = isTransparent ? '' : 'invert';
  const shellClasses = isTransparent
    ? 'text-white'
    : isScrolled
      ? 'text-[#1F2937]'
      : 'text-white';

  const chromeClasses = isTransparent
    ? 'bg-[linear-gradient(180deg,rgba(18,27,21,0.76)_0%,rgba(18,27,21,0.56)_100%)] backdrop-blur-[18px] backdrop-saturate-[150%] shadow-[0_10px_28px_rgba(0,0,0,0.08)]'
    : isScrolled
      ? 'bg-white/94 backdrop-blur-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.08)]'
      : 'bg-[linear-gradient(180deg,rgba(18,27,21,0.76)_0%,rgba(18,27,21,0.56)_100%)] backdrop-blur-[18px] backdrop-saturate-[150%] shadow-[0_10px_28px_rgba(0,0,0,0.08)]';

  const linkBase = 'inline-flex items-center leading-none uppercase tracking-[0.14em] transition-colors text-[11px] xl:text-xs font-semibold';
  const linkIdle = isScrolled ? 'text-[#1F2937]/82 hover:text-[#5CB85C]' : 'text-white/82 hover:text-[#8FCB81]';
  const activeLine = isScrolled ? 'after:bg-[#5CB85C]' : 'after:bg-[#5CB85C]';

  const navContent = (
    <nav
      ref={navRef as unknown as React.RefObject<HTMLElement>}
      className={`fixed inset-x-0 top-0 z-[220] transition-[background-color,backdrop-filter,box-shadow,color] duration-300 ease-out ${shellClasses} ${chromeClasses}`}
      onClick={() => {
        if (mobileMenuOpen) setMobileMenuOpen(false);
      }}
      onMouseLeave={() => setDestinosOpen(false)}
    >
      <div className="container relative mx-auto flex h-[82px] items-center justify-between px-4 md:px-6 lg:px-8">
        <div aria-hidden className="h-10 w-10 shrink-0 lg:hidden" />

        <Link href="/" className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-3 lg:pointer-events-auto lg:static lg:translate-x-0">
          <div className="flex h-9 items-center md:h-10">
            <Image
              src={logoSrc}
              alt={logoAlt}
              width={180}
              height={52}
              className={`h-full w-auto object-contain transition duration-300 ${logoToneClass}`}
            />
          </div>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          <Link href="/" className={`${linkBase} ${linkIdle} relative after:absolute after:-bottom-[22px] after:left-0 after:h-[2px] after:w-full after:rounded-full after:opacity-0 after:transition-opacity hover:after:opacity-100 md:after:-bottom-[26px] ${activeLine}`}>
            Inicio
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setDestinosOpen((current) => !current)}
              onMouseEnter={() => setDestinosOpen(true)}
              className={`${linkBase} ${linkIdle} relative gap-1.5 after:absolute after:-bottom-[22px] after:left-0 after:h-[2px] after:w-full after:rounded-full after:transition-opacity md:after:-bottom-[26px] ${activeLine} ${destinosOpen ? 'after:opacity-100' : 'after:opacity-0 hover:after:opacity-100'}`}
              aria-haspopup="true"
              aria-expanded={destinosOpen}
            >
              Destinos
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${destinosOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <Link href="/excursiones" className={`${linkBase} ${linkIdle} relative after:absolute after:-bottom-[22px] after:left-0 after:h-[2px] after:w-full after:rounded-full after:opacity-0 after:transition-opacity hover:after:opacity-100 md:after:-bottom-[26px] ${activeLine}`}>
            Excursiones
          </Link>
          <Link href="/#nosotros" className={`${linkBase} ${linkIdle} relative after:absolute after:-bottom-[22px] after:left-0 after:h-[2px] after:w-full after:rounded-full after:opacity-0 after:transition-opacity hover:after:opacity-100 md:after:-bottom-[26px] ${activeLine}`}>
            Sobre nosotros
          </Link>
          <Link href="/contacto" className={`${linkBase} ${linkIdle} relative after:absolute after:-bottom-[22px] after:left-0 after:h-[2px] after:w-full after:rounded-full after:opacity-0 after:transition-opacity hover:after:opacity-100 md:after:-bottom-[26px] ${activeLine}`}>
            Contacto
          </Link>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={whatsAppHref}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-[0.02em] transition ${
              isScrolled ? 'bg-[#2EBE63] text-white hover:bg-[#27ab59]' : 'bg-[#2EBE63] text-white hover:bg-[#27ab59]'
            }`}
          >
            <Phone className="h-4 w-4" />
            Consultá ahora
          </a>
        </div>

        <button
          type="button"
          className="relative z-10 inline-flex items-center justify-center rounded-xl p-2 lg:hidden"
          onClick={(event) => {
            event.stopPropagation();
            setMobileMenuOpen((current) => !current);
          }}
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileMenuOpen ? (
            <X className={`h-6 w-6 ${isScrolled ? 'text-[#0B2240]' : 'text-white'}`} />
          ) : (
            <Menu className={`h-6 w-6 ${isScrolled ? 'text-[#0B2240]' : 'text-white'}`} />
          )}
        </button>
      </div>

      <AnimatePresence>
        {destinosOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="hidden lg:block"
            onMouseEnter={() => setDestinosOpen(true)}
          >
            <div className="container mx-auto px-4 pb-5 md:px-6 lg:px-8">
              <div
                className={`rounded-[24px] border backdrop-blur-[18px] ${
                  isScrolled
                    ? 'border-[#E8ECE8] bg-white/96 shadow-[0_12px_36px_rgba(0,0,0,0.08)]'
                    : 'border-white/8 bg-[linear-gradient(180deg,rgba(17,32,25,0.78)_0%,rgba(17,32,25,0.58)_100%)] shadow-[0_14px_36px_rgba(0,0,0,0.12)]'
                }`}
              >
                <div className="grid gap-6 p-6 lg:grid-cols-[260px_1fr]">
                  <div
                    className={`rounded-[20px] border p-5 ${
                      isScrolled ? 'border-[#E7EEF5] bg-[#F6FBFF]/90' : 'border-white/10 bg-white/6'
                    }`}
                  >
                    <div className={`text-[11px] font-bold uppercase tracking-[0.18em] ${isScrolled ? 'text-[#5A7898]' : 'text-white/58'}`}>
                      Explorá la Patagonia
                    </div>
                    <div className={`mt-2 text-xs ${isScrolled ? 'text-[#0B2240]/80' : 'text-white/78'}`}>
                      Descubrí los mejores destinos y experiencias, con la curación BAFT.
                    </div>
                    <Link
                      href="/excursiones"
                      className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition ${
                        isScrolled
                          ? 'border border-[#D8E7F5] bg-white text-[#112B49] hover:bg-[#F8FCFF]'
                          : 'border border-white/10 bg-white/8 text-white hover:bg-white/12'
                      }`}
                      onClick={() => setDestinosOpen(false)}
                    >
                      Ver todos los destinos
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {destinosItems.map((item) => (
                      <Link
                        key={item.id}
                        href={`/destinos/${item.slug}`}
                        className={`group rounded-[20px] border p-3 transition duration-200 ${
                          isScrolled
                            ? 'border-[#E7EEF5] bg-white/92 hover:border-[#D6E5D6] hover:bg-white'
                            : 'border-white/10 bg-white/6 hover:border-white/14 hover:bg-white/8'
                        }`}
                        onClick={() => setDestinosOpen(false)}
                      >
                        <div className="flex gap-3">
                          <div className={`relative h-14 w-14 overflow-hidden rounded-2xl ${isScrolled ? 'bg-[#EEF6FF]' : 'bg-white/10'}`}>
                            <Image
                              src={item.imagen || '/images/hero-placeholder.svg'}
                              alt={item.nombre}
                              fill
                              className="object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                              sizes="56px"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className={`truncate text-[13px] font-extrabold tracking-[-0.01em] ${isScrolled ? 'text-[#0B2240]' : 'text-white'}`}>
                              {item.nombre}
                            </div>
                            <div className={`mt-1 line-clamp-2 text-xs leading-snug ${isScrolled ? 'text-[#5A7898]' : 'text-white/68'}`}>
                              {getDestinoSubtitle(item)}
                            </div>
                            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-bold ${isScrolled ? 'text-[#0B7FA5]' : 'text-[#8FCB81]'}`}>
                              Ver destino <ChevronRight className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[260] lg:hidden"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="absolute inset-0 flex justify-end">
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 h-dvh max-h-dvh w-[88vw] max-w-[360px] overflow-y-auto overscroll-contain bg-white shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
                onClick={(event) => event.stopPropagation()}
              >
              <div className="flex min-h-dvh flex-col p-6">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#5A7898]">Menú</div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setDestinosMobileOpen(false);
                    }}
                    className="rounded-full bg-[#F2F6FB] p-2"
                    aria-label="Cerrar menú"
                  >
                    <X className="h-5 w-5 text-[#0B2240]" />
                  </button>
                </div>

                <nav className="mt-6 space-y-1">
                  <Link
                    href="/"
                    className="block rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#0B2240] hover:bg-[#F6FBFF]"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setDestinosMobileOpen(false);
                    }}
                  >
                    Inicio
                  </Link>

                  <button
                    type="button"
                    onClick={() => setDestinosMobileOpen((current) => !current)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#0B2240] hover:bg-[#F6FBFF]"
                    aria-expanded={destinosMobileOpen}
                  >
                    Destinos
                    <ChevronDown className={`h-4 w-4 transition-transform ${destinosMobileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {destinosMobileOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden px-3 pb-2"
                      >
                        <div className="grid gap-2 pt-2 sm:grid-cols-2">
                          {destinosItems.map((item) => (
                            <Link
                              key={item.id}
                              href={`/destinos/${item.slug}`}
                              className="flex items-center gap-2 rounded-2xl border border-[#E7EEF5] bg-white p-2.5"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                setDestinosMobileOpen(false);
                              }}
                            >
                              <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-[#EEF6FF]">
                                <Image
                                  src={item.imagen || '/images/hero-placeholder.svg'}
                                  alt={item.nombre}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-xs font-extrabold text-[#0B2240]">{item.nombre}</div>
                                <div className="mt-0.5 line-clamp-1 text-[11px] text-[#5A7898]">
                                  {getDestinoSubtitle(item)}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                        <Link
                          href="/excursiones"
                          className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#0B7FA5]"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setDestinosMobileOpen(false);
                          }}
                        >
                          Ver todos <ChevronRight className="h-4 w-4" />
                        </Link>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <Link
                    href="/excursiones"
                    className="block rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#0B2240] hover:bg-[#F6FBFF]"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setDestinosMobileOpen(false);
                    }}
                  >
                    Excursiones
                  </Link>
                  <Link
                    href="/#nosotros"
                    className="block rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#0B2240] hover:bg-[#F6FBFF]"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setDestinosMobileOpen(false);
                    }}
                  >
                    Sobre nosotros
                  </Link>
                  <Link
                    href="/contacto"
                    className="block rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#0B2240] hover:bg-[#F6FBFF]"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setDestinosMobileOpen(false);
                    }}
                  >
                    Contacto
                  </Link>
                </nav>

                <a
                  href={whatsAppHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0E3B2E] px-4 py-3 text-[13px] font-semibold text-white hover:bg-[#0B2E24]"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setDestinosMobileOpen(false);
                  }}
                >
                  <Phone className="h-4 w-4" />
                  Consultá ahora
                </a>
              </div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );

  return (
    <>
      {reserveSpace && !isFloatingVariant ? <div aria-hidden className="w-full" style={{ height: navHeight || 112 }} /> : null}
      {mounted && typeof document !== 'undefined' ? createPortal(navContent, document.body) : navContent}
    </>
  );
}
