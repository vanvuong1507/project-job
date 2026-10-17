'use client';

import { cn } from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'weeklyData' },
  { href: '/events', label: 'events' },
] as const;

/** Section navigation: a sidebar from `lg`, a tab row on phones and tablets. Locale-aware links. */
export function AppNav() {
  const t = useTranslations('shell.nav');
  const pathname = usePathname(); // without the locale prefix

  return (
    <nav aria-label={t('label')}>
      <ul className="flex gap-1 lg:flex-col">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block rounded-control px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
                )}
              >
                {t(label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
