import 'server-only';
import { env } from '@/env';
import type { RevenueTrendSource } from '../../source';
import { buildRevenueTrend } from './build-revenue-trend';

/** In-process fixtures (no backend yet). `MOCK_DELAY_MS` simulates latency to exercise loading states. */
export function createMockSource(): RevenueTrendSource {
  return {
    async getRevenueTrend(weekStart) {
      if (env.MOCK_DELAY_MS) await new Promise((resolve) => setTimeout(resolve, env.MOCK_DELAY_MS));
      return buildRevenueTrend(weekStart);
    },
  };
}
