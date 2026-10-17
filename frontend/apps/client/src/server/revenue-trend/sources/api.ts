import 'server-only';
import {
  createHttpClient,
  isApiError,
  requestIdInterceptor,
  type RevenueTrendResponse,
} from '@frontend/api-client';
import { InvalidWeekStartError } from '@/features/revenue-trend/lib/week-start';
import { logger } from '../../logger';
import type { RevenueTrendSource } from '../source';

/** The real backend (`GET /api/dashboard/revenue-trend`, §1.2), with request ids and GET retries. */
export function createApiSource(baseUrl: string): RevenueTrendSource {
  const client = createHttpClient({
    baseUrl,
    interceptors: [requestIdInterceptor()],
    retry: { attempts: 3, baseDelayMs: 200 },
  });

  return {
    async getRevenueTrend(weekStart) {
      try {
        return await client.get<RevenueTrendResponse>('/api/dashboard/revenue-trend', {
          query: { weekStart },
          cache: 'no-store',
        });
      } catch (error) {
        // Keep one error vocabulary for callers, whichever source answered.
        if (isApiError(error) && error.code === 'VALIDATION_FAILED')
          throw new InvalidWeekStartError(weekStart ?? '');
        if (isApiError(error)) {
          logger.error('backend request failed', {
            status: error.status,
            code: error.code,
            requestId: error.requestId,
            error,
          });
        }
        throw error;
      }
    },
  };
}
