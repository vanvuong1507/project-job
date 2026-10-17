import { LOCALES } from '@frontend/i18n';
import type { MetadataRoute } from 'next';
import { languageAlternates, localePath, SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    Object.entries(languageAlternates()).map(([lang, path]) => [lang, `${SITE_URL}${path}`]),
  );
  return LOCALES.map((locale) => ({
    url: `${SITE_URL}${localePath(locale)}`,
    changeFrequency: 'daily',
    priority: 1,
    alternates: { languages },
  }));
}
