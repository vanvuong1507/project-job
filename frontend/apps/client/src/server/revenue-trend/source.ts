import 'server-only';
import type { RevenueTrendResponse } from '@frontend/api-client';

/** Where dashboard data comes from. Implementations: in-process mock, or the real backend over HTTP. */
export interface RevenueTrendSource {
  /** `weekStart` is already validated (a Monday) or undefined for "latest week with data". */
  getRevenueTrend(weekStart?: string): Promise<RevenueTrendResponse>;
}
