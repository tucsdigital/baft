import { collection, getDocs, orderBy as firestoreOrderBy, query, where } from 'firebase/firestore';
import { db, firebaseEnabled } from '@/lib/firebase';
import { Categoria, Paquete } from '@/types';
import Navbar from '@/components/Navbar';
import HomeFooter from '@/components/home/HomeFooter';
import WhatsAppButton from '@/components/WhatsAppButton';
import PaquetesClient from '@/components/PaquetesClient';
import type { Metadata } from 'next';
import { serializeFirestoreData } from '@/lib/utils/serialize';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/constants';
import { buildPageTitle, siteConfig } from '@/lib/siteConfig';
import { syncPackageCategoryData } from '@/lib/packages/category-utils';
import { getLocale } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';
import { localizeCategoria, localizePaquete } from '@/lib/i18n/cms-content';

const siteUrl = SITE_URL;

export const metadata: Metadata = {
  title: buildPageTitle('Excursiones'),
  description: `Explorá nuestras excursiones con ${SITE_NAME}. ${SITE_DESCRIPTION}`,
  alternates: {
    canonical: `${siteUrl}/excursiones`,
  },
  openGraph: {
    type: 'website',
    url: `${siteUrl}/excursiones`,
    title: buildPageTitle('Excursiones'),
    description: `Explorá nuestras excursiones con ${SITE_NAME}.`,
    siteName: SITE_NAME,
    locale: siteConfig.seo.locale,
  },
  twitter: {
    card: 'summary_large_image',
    title: buildPageTitle('Excursiones'),
    description: `Explorá nuestras excursiones con ${SITE_NAME}.`,
  },
  keywords: [...siteConfig.seo.keywords, 'excursiones', 'salidas', 'viajes'],
};

/** Sin caché: los cambios del admin (excursiones) se ven de inmediato */
export const revalidate = 0;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function getPaquetes(): Promise<Paquete[]> {
  if (!firebaseEnabled) return [];
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'paquetes'),
        where('visible', '==', true),
        firestoreOrderBy('orden', 'asc')
      )
    );

    return snapshot.docs.map((doc) => serializeFirestoreData<Paquete>({ id: doc.id, ...doc.data() }));
  } catch (error) {
    const snapshot = await getDocs(query(collection(db, 'paquetes'), where('visible', '==', true)));
    return snapshot.docs
      .map((doc) => serializeFirestoreData<Paquete>({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }
}

async function getCategorias(): Promise<Categoria[]> {
  if (!firebaseEnabled) return [];
  try {
    const snapshot = await getDocs(
      query(
        collection(db, 'categorias'),
        where('activa', '==', true),
        firestoreOrderBy('orden', 'asc')
      )
    );

    return snapshot.docs.map((doc) => serializeFirestoreData<Categoria>({ id: doc.id, ...doc.data() }));
  } catch (error) {
    const snapshot = await getDocs(query(collection(db, 'categorias'), where('activa', '==', true)));
    return snapshot.docs
      .map((doc) => serializeFirestoreData<Categoria>({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }
}

function normalizeParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((v) => String(v).split(','))
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeText(value: string | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export default async function ExcursionesPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const locale = (await getLocale()) as AppLocale;
  const resolvedSearchParams = (await searchParams) ?? {};
  const [paquetes, categorias] = await Promise.all([getPaquetes(), getCategorias()]);
  const localizedCategorias = await Promise.all(categorias.map((categoria) => localizeCategoria(categoria, locale)));
  const normalizedPaquetes = await Promise.all(
    paquetes.map((paquete) => localizePaquete(syncPackageCategoryData(paquete, categorias), locale))
  );

  const tipos = normalizeParam(resolvedSearchParams.tipo);
  const tag = normalizeParam(resolvedSearchParams.tag);
  const transportes = normalizeParam(resolvedSearchParams.transporte);
  const destinosSeleccionados = normalizeParam([
    ...(Array.isArray(resolvedSearchParams.destino)
      ? resolvedSearchParams.destino
      : resolvedSearchParams.destino
        ? [resolvedSearchParams.destino]
        : []),
    ...(Array.isArray(resolvedSearchParams.categoria)
      ? resolvedSearchParams.categoria
      : resolvedSearchParams.categoria
        ? [resolvedSearchParams.categoria]
        : []),
  ]);

  let heroTitle = locale === 'en' ? 'Excursions' : 'Excursiones';
  let heroSubtitle = locale === 'en'
    ? 'Discover excursions and departures designed for unforgettable experiences'
    : 'Descubrí excursiones y salidas pensadas para vivir experiencias inolvidables';
  const categoriaPrincipal =
    destinosSeleccionados.length === 1
      ? localizedCategorias.find((categoria) => {
          const selectedDestino = destinosSeleccionados[0];
          return (
            normalizeText(categoria.slug) === selectedDestino ||
            normalizeText(categoria.nombre) === selectedDestino
          );
        }) ?? null
      : null;

  if (categoriaPrincipal) {
    heroTitle = categoriaPrincipal.nombre;
    heroSubtitle =
      categoriaPrincipal.descripcion || `${locale === 'en' ? 'Explore the excursions available in' : 'Explorá las excursiones disponibles en'} ${categoriaPrincipal.nombre}`;
  } else if (tipos.includes('grupal')) {
    heroTitle = locale === 'en' ? 'Group departures' : 'Salidas grupales';
    heroSubtitle = locale === 'en' ? 'Organized trips to share, fully planned' : 'Viajes organizados para compartir, con todo planificado';
  } else if (tipos.includes('internacional')) {
    heroTitle = locale === 'en' ? 'International excursions' : 'Excursiones internacionales';
    heroSubtitle = locale === 'en' ? 'Explore international destinations with selected proposals' : 'Explorá destinos internacionales con propuestas seleccionadas';
  } else if (tipos.includes('educativo')) {
    heroTitle = locale === 'en' ? 'Educational excursions' : 'Excursiones educativas';
    heroSubtitle = locale === 'en' ? 'Options designed for institutions, groups and contingents' : 'Opciones pensadas para instituciones, contingentes y grupos';
  } else if (tipos.includes('eventos') || tipos.includes('recitales')) {
    heroTitle = locale === 'en' ? 'Events / Concerts' : 'Eventos / Recitales';
    heroSubtitle = locale === 'en' ? 'Events and concerts to enjoy with your group' : 'Eventos y recitales para compartir con tu grupo';
  } else if (transportes.length > 0) {
    heroTitle = locale === 'en' ? 'Excursions with transport' : 'Excursiones con transporte';
    heroSubtitle = locale === 'en' ? 'Find excursions by type of transport' : 'Encontrá excursiones por tipo de transporte';
  } else if (tag.includes('promo')) {
    heroTitle = locale === 'en' ? 'Deals' : 'Promos';
    heroSubtitle = locale === 'en' ? 'Offers and opportunities to travel at the best price' : 'Ofertas y oportunidades para viajar al mejor precio';
  } else if (tag.includes('escapada') || tag.includes('religioso')) {
    heroTitle = locale === 'en' ? 'Events / Concerts' : 'Eventos / Recitales';
    heroSubtitle = locale === 'en' ? 'Events and concerts to enjoy with your group' : 'Eventos y recitales para compartir con tu grupo';
  }

  return (
    <>
      <Navbar variant="homeMockup" reserveSpace />
      <WhatsAppButton />

      <section className="relative border-b border-[#EDF2F7] bg-white pb-10 pt-24 text-black md:pb-12 md:pt-28">
        <div className="container mx-auto px-4 md:px-6 lg:px-8">
          <div className="mx-auto text-center md:text-left">
            <h1 className="mb-3 text-[34px] font-extrabold leading-[1.02] tracking-[-0.03em] text-[#112B49] md:mb-4 md:text-[44px]">
              {heroTitle}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[#6C829A] md:text-lg">
              {heroSubtitle}
            </p>
          </div>
        </div>
      </section>

      <PaquetesClient paquetes={normalizedPaquetes} categorias={localizedCategorias} />

      <HomeFooter />
    </>
  );
}
