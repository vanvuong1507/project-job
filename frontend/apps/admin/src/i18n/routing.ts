import { DEFAULT_LOCALE, LOCALES } from '@frontend/i18n';
import { defineRouting } from 'next-intl/routing';

/** `/` = English (default, no prefix), `/vi` = Vietnamese. Negotiated from the NEXT_LOCALE cookie, then Accept-Language. */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
});
