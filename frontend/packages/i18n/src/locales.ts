/** Locales supported by every app. Order = display order in switchers. */
export const LOCALES = ['en', 'vi'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Each locale's name in its own language (switchers show it untranslated). */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  vi: 'Tiếng Việt',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
