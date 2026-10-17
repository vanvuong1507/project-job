import type { DayMetrics } from '@frontend/api-client';
import type { ColorToken } from '@frontend/ui';

/**
 * Single source of truth for the chart series: colours and which metric feeds them.
 * Labels live in the message catalogs under `dashboard.series.<key>.{label,current,previous}`.
 */
export interface SeriesDefinition {
  key: string;
  metric: keyof Omit<DayMetrics, 'covers'>;
  /** Bars that share a stack are drawn on top of each other. */
  stack: 'revenue' | 'labour';
  currentColor: ColorToken;
  previousColor: ColorToken;
}

export const SERIES = [
  {
    key: 'pos',
    metric: 'posRevenue',
    stack: 'revenue',
    currentColor: 'chart-pos',
    previousColor: 'chart-pos-prev',
  },
  {
    key: 'eatclub',
    metric: 'eatclubRevenue',
    stack: 'revenue',
    currentColor: 'chart-eatclub',
    previousColor: 'chart-eatclub-prev',
  },
  {
    key: 'labour',
    metric: 'labourCost',
    stack: 'labour',
    currentColor: 'chart-labour',
    previousColor: 'chart-labour-prev',
  },
] as const satisfies readonly SeriesDefinition[];

export type SeriesKey = (typeof SERIES)[number]['key'];

export const ALL_SERIES_KEYS: readonly SeriesKey[] = SERIES.map((series) => series.key);
