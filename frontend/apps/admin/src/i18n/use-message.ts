import { useTranslations } from 'next-intl';

type Values = Record<string, string | number>;

/**
 * Translates message *keys* that come from Server Actions and zod schemas (`validation.number`,
 * `auth.tooManyAttempts`). Unknown keys fall back to the raw text, so a missing key never breaks the UI.
 */
export function useMessage() {
  const t = useTranslations();
  return (key: string | undefined, values?: Values): string | undefined => {
    if (!key) return undefined;
    return t.has(key as never) ? t(key as never, values as never) : key;
  };
}
