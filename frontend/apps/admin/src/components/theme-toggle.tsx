'use client';

import { Select } from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useIsClient } from './use-is-client';

const THEMES = ['light', 'dark', 'system'] as const;

/** Light / Dark / System. The stored theme is unknown on the server, so the value renders after mount. */
export function ThemeToggle() {
  const t = useTranslations('common.theme');
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();

  return (
    <Select
      aria-label={t('label')}
      className="h-8 w-auto"
      value={isClient ? (theme ?? 'system') : 'system'}
      onChange={(event) => setTheme(event.target.value)}
    >
      {THEMES.map((value) => (
        <option key={value} value={value}>
          {t(value)}
        </option>
      ))}
    </Select>
  );
}
