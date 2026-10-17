import { DEFAULT_LOCALE, LOCALES, type Locale } from '@frontend/i18n';
import { env } from '@/env';

/** Public URL of the site (metadataBase, sitemap, robots). */
export const SITE_URL = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');

/** Path of the dashboard in a locale (`as-needed` prefix: the default locale has none). */
export const localePath = (locale: Locale, path = '/') =>
  locale === DEFAULT_LOCALE ? path : `/${locale}${path === '/' ? '' : path}`;

/** `alternates.languages` for a path: `{ en: '/', vi: '/vi', 'x-default': '/' }`. */
export function languageAlternates(path = '/') {
  return {
    ...Object.fromEntries(LOCALES.map((locale) => [locale, localePath(locale, path)])),
    'x-default': localePath(DEFAULT_LOCALE, path),
  };
}
