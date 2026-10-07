import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { routing, type AppLocale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requestHeaders = await headers();
  const headerLocale = requestHeaders.get('x-baft-locale');
  const requestedLocale = headerLocale || await requestLocale;
  const locale: AppLocale = routing.locales.includes(requestedLocale as AppLocale)
    ? (requestedLocale as AppLocale)
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
