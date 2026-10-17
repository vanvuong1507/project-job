import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/site-header';
import { WebVitals } from '@/components/web-vitals';
import { routing } from '@/i18n/routing';
import { languageAlternates, SITE_URL } from '@/lib/site';
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
    metadataBase: new URL(SITE_URL),
    title: { default: t('title'), template: `%s · ${t('title')}` },
    description: t('description'),
    alternates: {
      canonical: languageAlternates()[locale as keyof ReturnType<typeof languageAlternates>] ?? '/',
      languages: languageAlternates(),
    },
    openGraph: {
      type: 'website',
      title: t('title'),
      description: t('description'),
      locale,
      siteName: t('title'),
    },
    twitter: { card: 'summary_large_image', title: t('title'), description: t('description') },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    // suppressHydrationWarning: next-themes sets the class before React hydrates (no theme flash).
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body>
        {/* Inherits locale, messages and time zone from src/i18n/request.ts. */}
        <NextIntlClientProvider>
          <WebVitals />
          <Providers>
            <SiteHeader />
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
