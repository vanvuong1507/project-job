import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AppNav } from '@/components/app-shell/app-nav';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutButton } from '@/features/auth/logout-button';
import { requireUser } from '@/server/authz';

/** Authenticated shell. A missing/expired session goes back to the login page (DAL check, not just proxy). */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, t] = await Promise.all([requireUser(), getTranslations('shell')]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="font-semibold">{t('appName')}</p>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="hidden text-sm text-muted-foreground sm:inline"
              data-testid="current-user"
            >
              {user.name}
            </span>
            <span
              className="rounded-control bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
              data-testid="current-role"
            >
              {t(`roles.${user.role}`)}
            </span>
            <LocaleSwitcher />
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-8">
        <aside className="lg:w-48 lg:shrink-0">
          <AppNav />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
