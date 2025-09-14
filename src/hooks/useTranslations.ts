'use client';

import { useTranslations as useNextIntlTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { locales, type Locale } from '@/i18n/config';

export function useTranslations() {
  const t = useNextIntlTranslations();
  const locale = useLocale() as Locale;

  return {
    t,
    locale,
    locales,
    isRTL: false, // Spanish and English are LTR languages
  };
}

export function useLanguage() {
  const locale = useLocale() as Locale;
  
  return {
    locale,
    locales,
    setLanguage: (newLocale: Locale) => {
      // This will be handled by the language selector component
      const currentPath = window.location.pathname;
      const pathWithoutLocale = currentPath.replace(/^\/[a-z]{2}/, '');
      window.location.href = `/${newLocale}${pathWithoutLocale}`;
    }
  };
}
