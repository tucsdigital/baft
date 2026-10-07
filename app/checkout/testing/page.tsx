import { notFound } from 'next/navigation';
import CheckoutClient from '@/components/checkout/CheckoutClient';
import type { Experience } from '@/components/landing-reserva/types';

export const metadata = { robots: { index: false, follow: false } };

export default function WeTravelTestPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const experience: Experience = {
    id: 'e2e-wetravel', slug: 'e2e-wetravel', title: 'Checkout test', subtitle: '', supportText: '',
    topNoticeText: '', videoOverlayText: '', images: [], galleryIntro: '', includes: [], takeaways: [],
    forWho: [], notForWho: [], testimonials: [], dividerPhrase: '', calendarIntro: '', reservationMicrocopy: '', faqs: [],
    bookingConfig: { enabled: true, title: '', subtitle1: '', subtitle2: '', hasSpecificDates: false,
      dates: [], depositAmount: 1000, maxPeoplePerBooking: 6, currency: 'ars', paymentMethods: { mercadoPago: true } },
  };
  return <CheckoutClient experience={experience} date="sin-fecha" people={1}
    pricing={{ unitAmountAdults: 1000, unitAmountMinors: 0, baseSubtotalAmount: 1000, extrasTotalAmount: 0, subtotalAmount: 1000, currency: 'ars' }} />;
}
