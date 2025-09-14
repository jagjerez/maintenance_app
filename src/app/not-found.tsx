import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { locales, defaultLocale } from '@/i18n/config';

export default async function NotFound() {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  const referer = headersList.get('referer') || '';
  
  // Try to detect language from referer URL first
  let locale = defaultLocale;
  
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const pathname = refererUrl.pathname;
      
      // Check if referer has any of our supported locale prefixes
      const detectedLocale = locales.find((loc: string) => pathname.startsWith(`/${loc}/`));
      if (detectedLocale) {
        locale = detectedLocale;
      }
    } catch {
      // If referer URL is invalid, continue with default
    }
  }
  
  // If no locale detected from referer, use Accept-Language header
  if (locale === defaultLocale && acceptLanguage) {
    const preferredLanguage = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim().toLowerCase())
      .find(lang => locales.some((loc: string) => lang.startsWith(loc)));
    
    if (preferredLanguage) {
      const detectedLocale = locales.find((loc: string) => preferredLanguage.startsWith(loc));
      if (detectedLocale) {
        locale = detectedLocale;
      }
    }
  }
  
  // Redirect to our custom not-found page with detected locale
  redirect(`/${locale}/page-wrong`);
}
