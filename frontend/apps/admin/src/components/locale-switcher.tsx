'use client';

import { LOCALE_LABELS, LOCALES, type Locale } from '@frontend/i18n';
import { Select } from '@frontend/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';

/** Switches language in place, keeping the current path and query (e.g. `?weekStart=`). */
export function LocaleSwitcher() {
  const t = useTranslations('common.locale');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      aria-label={t('label')}
      className="h-8 w-auto"
      value={locale}
      disabled={pending}
      onChange={(event) => {
        const next = event.target.value as Locale;
        startTransition(() =>
          router.replace({ pathname, query: Object.fromEntries(searchParams) }, { locale: next }),
        );
      }}
    >
      {LOCALES.map((value) => (
        <option key={value} value={value} lang={value}>
          {LOCALE_LABELS[value]}
        </option>
      ))}
    </Select>
  );
}
