import 'server-only';
import type { RevenueTrendResponse } from '@frontend/api-client';
import { cache } from 'react';
import { env } from '@/env';
import type { RevenueTrendSource } from './source';
import { createApiSource } from './sources/api';
import { createMockSource } from './sources/mock';

/**
 * Data Access Layer for the dashboard: the only way pages and route handlers read revenue data.
 * Server Components call it directly — never through this app's own Route Handlers.
 */

function createSource(): RevenueTrendSource {
  if (env.DATA_SOURCE === 'api') {
    if (!env.API_URL) throw new Error('API_URL is required when DATA_SOURCE=api');
    return createApiSource(env.API_URL);
  }
  return createMockSource();
}

const source = createSource();

/** Deduplicated per request (React `cache`), e.g. when metadata and the page both need the data. */
export const getRevenueTrend = cache((weekStart?: string): Promise<RevenueTrendResponse> =>
  source.getRevenueTrend(weekStart),
);

/** A week counts as empty when no current-period metric has a value. */
export function isEmptyTrend({ days }: RevenueTrendResponse): boolean {
  return days.every(({ current }) => Object.values(current).every((value) => value === 0));
}
