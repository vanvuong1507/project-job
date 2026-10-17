import 'server-only';
import type { DailyMetric } from '@frontend/api-client';
import { addDays } from '@/lib/week';
import type { DailyMetricInput, DayMetricsInput } from '@/features/metrics/schemas';
import { repositories } from './data-source';
import type { DateRange } from './repositories';

/** Daily metrics DAL. Authorization is enforced by callers (pages, actions, handlers) via `server/authz`. */

export const listMetrics = (range: DateRange): Promise<DailyMetric[]> =>
  repositories.metrics.list(range);

export const listWeekMetrics = (weekStart: string): Promise<DailyMetric[]> =>
  repositories.metrics.list({ from: weekStart, to: addDays(weekStart, 6) });

export const createMetric = (input: DailyMetricInput) => repositories.metrics.create(input);
export const updateMetric = (id: string, input: DailyMetricInput) =>
  repositories.metrics.update(id, input);
export const deleteMetric = (id: string) => repositories.metrics.remove(id);
export const upsertWeek = (weekStart: string, days: readonly DayMetricsInput[]) =>
  repositories.metrics.upsertWeek(weekStart, days);
