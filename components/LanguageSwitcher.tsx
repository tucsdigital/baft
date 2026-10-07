'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';
import { routing, type AppLocale } from '@/i18n/routing';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

export default function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const t = useTranslations('common');
  const hydrated = useSyncExternalStore(subscribe, clientReady, serverReady);

  const changeLocale = (nextLocale: AppLocale) => {
    if (nextLocale === locale) return;
    const currentPath = pathname || '/';
    const withoutLocale = currentPath.replace(/^\/(es|en)(?=\/|$)/, '') || '/';
    document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.assign(`/${nextLocale}${withoutLocale === '/' ? '' : withoutLocale}${window.location.search}${window.location.hash}`);
  };

  return (
    <label className="inline-flex items-center gap-1.5 rounded-full border border-current/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em]">
      <Languages className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">{t('language')}</span>
      <select
        value={locale}
        disabled={!hydrated}
        onChange={(event) => changeLocale(event.target.value as AppLocale)}
        aria-label={t('language')}
        className="cursor-pointer bg-transparent outline-none"
      >
        {routing.locales.map((option) => (
          <option key={option} value={option} className="text-[#0B2240]">
            {option === 'es' ? t('spanish') : t('english')}
          </option>
        ))}
      </select>
    </label>
  );
}
