import { redirect } from 'next/navigation';
import { getPaqueteBySlug, toBookingPublicData } from '@/lib/paquetes';
import CheckoutClient from '@/components/checkout/CheckoutClient';

/** Sin caché: datos de experiencia y reserva siempre actualizados */
export const revalidate = 0;

type SearchParams = Promise<{ slug?: string; date?: string; people?: string; cart?: string }>;

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const slug = params.slug?.trim();
  const dateParam = params.date?.trim();
  if (params.cart === '1') redirect('/excursiones');
  if (!slug) redirect('/');

  const paquete = await getPaqueteBySlug(slug);
  if (!paquete) {
    redirect('/');
  }

  // Mapeo temporal de paquete a formato Experience para compatibilidad con CheckoutClient
  const experience = {
    id: paquete.id,
    slug: paquete.slug,
    title: paquete.titulo,
    subtitle: paquete.subtitulo ?? '',
    cardImage: paquete.imagenCard ?? '',
    images: paquete.imagenes ?? [],
    maxPeople: paquete.bookingConfig?.maxPeoplePerBooking ?? paquete.capacidadMaxima ?? 10,
    galleryIntro: paquete.descripcionCorta ?? '',
    dividerPhrase: paquete.subtitulo ?? '',
    calendarIntro: paquete.descripcionCorta ?? '',
    reservationMicrocopy: paquete.descripcionLarga ?? '',
    faqs: paquete.faqs?.map((f, i) => ({
      id: String(i),
      question: (f as any).pregunta ?? (f as any).question ?? '',
      answer: (f as any).respuesta ?? (f as any).answer ?? '',
    })) ?? [],
    bookingConfig: paquete.bookingConfig as any,
    supportText: paquete.descripcionCorta ?? '',
    topNoticeText: '',
    videoOverlayText: '',
    includes: [],
    highlights: [],
    itinerary: [],
    testimonials: [],
    headerImage: paquete.imagenCard ?? '',
    takeaways: [],
    forWho: [],
    notForWho: [],
    gastosAdministrativos:
      typeof (paquete as any).gastosAdministrativos === 'number'
        ? (paquete as any).gastosAdministrativos
        : 0,
  };

  const bookingData = toBookingPublicData(paquete as any, {});
  const parsedPeople = Number(params.people ?? '1');
  const people = Number.isFinite(parsedPeople) ? Math.max(1, Math.min(50, Math.floor(parsedPeople))) : 1;

  const hasSpecificDates = bookingData?.hasSpecificDates ?? true;
  const isNoDate = !dateParam || dateParam === 'sin-fecha';
  if (hasSpecificDates && isNoDate) {
    redirect(`/excursion/${slug}`);
  }
  if (!hasSpecificDates && !isNoDate) {
    // Si no hay fechas específicas, ignorar date o normalizar a sin-fecha
  }
  const date = isNoDate ? 'sin-fecha' : dateParam;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (date !== 'sin-fecha' && !dateRegex.test(date)) {
    redirect('/');
  }

  const safePeople = Math.min(people, bookingData?.maxPeoplePerBooking ?? people);

  return <CheckoutClient experience={experience as any} date={date} people={safePeople} />;
}
