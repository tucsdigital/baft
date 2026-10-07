import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

export const revalidate = 0;

export default async function CarritoPage() {
  redirect(`/${await getLocale()}/excursiones`);
}
