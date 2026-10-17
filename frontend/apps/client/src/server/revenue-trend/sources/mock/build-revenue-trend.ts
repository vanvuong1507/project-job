import 'server-only';
import type {
  DayMetrics,
  RevenueTrendDay,
  RevenueTrendResponse,
  SummaryValue,
} from '@frontend/api-client';
import { fixtures, type MockDataset } from './data';
import { addDays, dayLabel, startOfWeek } from '@/lib/dates';

/** Mock implementation of `GET /api/dashboard/revenue-trend` (docs/US-TASK-DETAIL.md §1.1–1.2). */

const DAYS_IN_WEEK = 7;
const EMPTY_DAY: DayMetrics = { posRevenue: 0, eatclubRevenue: 0, labourCost: 0, covers: 0 };

function roundTo(value: number, fractionDigits: number): number {
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
}

function summaryValue(current: number, previous: number): SummaryValue {
  return {
    current,
    previous,
    changePct: previous === 0 ? null : roundTo(((current - previous) / previous) * 100, 1),
  };
}

function latestWeekStart(dataset: MockDataset): string | undefined {
  const latest = dataset.dailyMetrics.reduce<string | undefined>(
    (max, { date }) => (max === undefined || date > max ? date : max),
    undefined,
  );
  return latest && startOfWeek(latest);
}

function weekMetrics(dataset: MockDataset, weekStart: string): DayMetrics[] {
  const byDate = new Map(dataset.dailyMetrics.map(({ date, ...metrics }) => [date, metrics]));
  return Array.from(
    { length: DAYS_IN_WEEK },
    (_, i) => byDate.get(addDays(weekStart, i)) ?? EMPTY_DAY,
  );
}

function totals(days: readonly DayMetrics[]) {
  const revenue = days.reduce((sum, d) => sum + d.posRevenue + d.eatclubRevenue, 0);
  const covers = days.reduce((sum, d) => sum + d.covers, 0);
  return { revenue: roundTo(revenue, 2), average: Math.round(revenue / DAYS_IN_WEEK), covers };
}

export function buildRevenueTrend(
  requestedWeekStart?: string,
  dataset: MockDataset = fixtures,
  today: () => string = () => new Date().toISOString().slice(0, 10),
): RevenueTrendResponse {
  const weekStart = requestedWeekStart ?? latestWeekStart(dataset) ?? startOfWeek(today());
  const previousStart = addDays(weekStart, -DAYS_IN_WEEK);

  const current = weekMetrics(dataset, weekStart);
  const previous = weekMetrics(dataset, previousStart);

  const days: RevenueTrendDay[] = current.map((metrics, i) => {
    const date = addDays(weekStart, i);
    return {
      dayLabel: dayLabel(date),
      date,
      current: metrics,
      previous: previous[i] ?? EMPTY_DAY,
      events: dataset.events
        .filter((event) => event.date === date)
        .map(({ impact, title, description }) => ({
          impact,
          title,
          description: description ?? null,
        })),
    };
  });

  const now = totals(current);
  const before = totals(previous);

  return {
    week: { start: weekStart, end: addDays(weekStart, DAYS_IN_WEEK - 1) },
    previous: { start: previousStart, end: addDays(previousStart, DAYS_IN_WEEK - 1) },
    days,
    summary: {
      totalRevenue: summaryValue(now.revenue, before.revenue),
      averagePerDay: summaryValue(now.average, before.average),
      totalCovers: summaryValue(now.covers, before.covers),
    },
  };
}
