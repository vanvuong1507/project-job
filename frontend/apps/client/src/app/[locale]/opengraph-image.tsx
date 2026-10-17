import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ImageResponse } from 'next/og';
import { routing } from '@/i18n/routing';

export const alt = 'Revenue Trend';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Localized social preview card (title + a stylised bar chart in the brand colours). */
export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const bars = [52, 58, 60, 57, 55, 80, 74];

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: '#f8f7f2',
        color: '#2a2a2a',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 64, fontWeight: 700 }}>{t('title')}</div>
        <div style={{ fontSize: 30, color: '#6b6b6b', marginTop: 12 }}>{t('description')}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, height: 240 }}>
        {bars.map((height, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', width: 90 }}>
            <div
              style={{ height: height * 0.6, background: '#595bee', borderRadius: '8px 8px 0 0' }}
            />
            <div style={{ height: height * 2.2, background: '#2a2a2a' }} />
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
