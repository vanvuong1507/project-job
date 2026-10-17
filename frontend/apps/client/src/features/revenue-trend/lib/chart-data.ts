import type { DayEvent, RevenueTrendDay } from '@frontend/api-client';
import { SERIES, type SeriesKey } from './series';

/** One chart category (day). Keys are `<series>` for the current period and `<series>Prev` for the previous one. */
export type ChartRow = {
  date: string;
  dayLabel: string;
  events: DayEvent[];
} & Record<SeriesKey | `${SeriesKey}Prev`, number>;

export function toChartRows(days: readonly RevenueTrendDay[]): ChartRow[] {
  return days.map((day) => {
    const row = { date: day.date, dayLabel: day.dayLabel, events: day.events } as ChartRow;
    for (const { key, metric } of SERIES) {
      row[key] = day.current[metric];
      row[`${key}Prev`] = day.previous[metric];
    }
    return row;
  });
}

export interface ChartView {
  compare: boolean;
  isVisible: (key: SeriesKey) => boolean;
}

/** Height of the tallest visible bar (stacks summed) for one day. */
export function tallestBar(row: ChartRow, { compare, isVisible }: ChartView): number {
  const periods = compare ? (['', 'Prev'] as const) : ([''] as const);
  let tallest = 0;
  for (const suffix of periods) {
    const stacks = new Map<string, number>();
    for (const { key, stack } of SERIES) {
      if (!isVisible(key)) continue;
      stacks.set(stack, (stacks.get(stack) ?? 0) + row[`${key}${suffix}`]);
    }
    tallest = Math.max(tallest, ...stacks.values());
  }
  return tallest;
}

/** Height of the tallest visible bar across the week — drives the Y axis. */
export function chartMax(rows: readonly ChartRow[], view: ChartView): number {
  return rows.reduce((max, row) => Math.max(max, tallestBar(row, view)), 0);
}
