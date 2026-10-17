import { ToastProvider } from '@frontend/ui';
import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { Providers } from '@/components/providers';
import { routing } from '@/i18n/routing';
import '../globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: hasLocale(routing.locales, locale) ? locale : 'en',
    namespace: 'metadata',
  });
  return {
    title: { default: t('title'), template: `%s · ${t('title')}` },
    robots: { index: false, follow: false },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    // suppressHydrationWarning: next-themes sets the class before React hydrates (no theme flash).
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <Providers>
            <ToastProvider>{children}</ToastProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
