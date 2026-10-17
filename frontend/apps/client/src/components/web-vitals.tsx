'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { env } from '@/env';

const endpoint = env.NEXT_PUBLIC_VITALS_URL;

/** Core Web Vitals: logged in development, beaconed to NEXT_PUBLIC_VITALS_URL when configured. */
export function WebVitals() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console -- development-only diagnostics
      console.debug('[web-vitals]', metric.name, Math.round(metric.value));
    }
    if (!endpoint) return;
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      id: metric.id,
      rating: metric.rating,
      page: location.pathname,
    });
    if (!navigator.sendBeacon?.(endpoint, body))
      void fetch(endpoint, { method: 'POST', body, keepalive: true });
  });
  return null;
}
