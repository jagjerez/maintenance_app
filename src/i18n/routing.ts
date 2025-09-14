import {defineRouting} from 'next-intl/routing';
import { locales, defaultLocale } from './config';
 
export const routing = defineRouting({
  // Dynamically get all locales from config
  locales: locales as readonly string[],
 
  // Used when no locale matches
  defaultLocale: defaultLocale
});