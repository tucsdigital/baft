import { permanentRedirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export default async function PaquetesRedirectPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item);
      }
      continue;
    }
    if (typeof value === 'string') {
      params.set(key, value);
    }
  }

  const locale = await getLocale();
  permanentRedirect(params.toString() ? `/${locale}/excursiones?${params.toString()}` : `/${locale}/excursiones`);
}
