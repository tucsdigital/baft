import { permanentRedirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import type { AppLocale } from '@/i18n/routing';

export default async function CategoriaRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  permanentRedirect(`/${locale}/destinos/${slug}`);
}
