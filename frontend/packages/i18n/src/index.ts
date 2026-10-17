import type { Messages } from './catalog';
import type { Locale } from './locales';
import en from './messages/common.en.json';
import vi from './messages/common.vi.json';

export { findMissingKeys, mergeMessages, type Messages } from './catalog';
export { DEFAULT_LOCALE, isLocale, LOCALE_LABELS, LOCALES, type Locale } from './locales';

/** Shared `common` namespace (theme, locale, generic errors, actions) for every app, per locale. */
export const commonMessages: Record<Locale, { common: typeof en } & Messages> = {
  en: { common: en },
  vi: { common: vi },
};

export type CommonMessages = typeof en;
