import { Card } from '@frontend/ui';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { LoginForm } from '@/features/auth/login-form';
import { getPathname } from '@/i18n/navigation';
import { safeNextPath } from '@/lib/redirects';
import { getCurrentUser } from '@/server/users';

export async function generateMetadata() {
  const t = await getTranslations('auth');
  return { title: t('title') };
}

export default async function LoginPage({ searchParams }: PageProps<'/[locale]/login'>) {
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const next = safeNextPath((await searchParams).next, getPathname({ href: '/', locale }));
  // Already signed in with a valid session → skip the form (a stale cookie just shows the form).
  if (await getCurrentUser()) redirect(next);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 py-10">
      <Card className="w-full max-w-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{t('auth.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('shell.appName')}</p>
          </div>
          <div className="flex flex-col gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <LoginForm next={next} />
      </Card>
    </main>
  );
}
