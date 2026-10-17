import { commonMessages, mergeMessages } from '@frontend/i18n';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

/**
 * Per-request i18n config → locale + messages.
 * An explicit locale (`getTranslations({ locale })`) wins; otherwise next-intl's `requestLocale`
 * (the `[locale]` segment, or the header set by proxy.ts). Not `next/root-params`: it throws inside
 * Server Actions and Route Handlers (e.g. logout, `opengraph-image`) in Next 16.4.
 */
export default getRequestConfig(async ({ locale: explicitLocale, requestLocale }) => {
  const requested = explicitLocale ?? (await requestLocale);
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const { default: messages } = await import(`./messages/${locale}.json`);

  return {
    locale,
    messages: mergeMessages(commonMessages[locale], messages),
    // Dates in these apps are calendar dates (YYYY-MM-DD), so format them in UTC everywhere.
    timeZone: 'UTC',
  };
});
