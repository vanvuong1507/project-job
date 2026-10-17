import { addDays, DAYS_IN_WEEK, dayLabel, weekDays } from '../../common/utils/dates.js';
import type {
  DayEvent,
  DayMetrics,
  RevenueTrendDay,
  RevenueTrendResponse,
  SummaryValue,
} from './dto/revenue-trend.dto.js';

/** Pure assembly of the dashboard payload (spec §1.1–1.2): no I/O, fully unit-tested. */

export interface MetricRow extends DayMetrics {
  date: string;
}

export interface EventRow extends DayEvent {
  date: string;
}

export interface RevenueTrendInput {
  /** Monday of the requested week. */
  weekStart: string;
  /** Rows of the current and previous week (any order; other dates are ignored). */
  metrics: readonly MetricRow[];
  /** Events of the current week (any order; other dates are ignored). */
  events: readonly EventRow[];
}

const EMPTY_DAY: DayMetrics = { posRevenue: 0, eatclubRevenue: 0, labourCost: 0, covers: 0 };

function roundTo(value: number, fractionDigits: number): number {
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
}

/** Change in percent, 1 decimal; `null` when there is no previous value to compare with. */
export function changePct(current: number, previous: number): number | null {
  return previous === 0 ? null : roundTo(((current - previous) / previous) * 100, 1);
}

function summaryValue(current: number, previous: number): SummaryValue {
  return { current, previous, changePct: changePct(current, previous) };
}

/** Totals for a week: revenue = POS + Eatclub (2 dp), average = revenue / 7 (whole dollars). */
export function weekTotals(days: readonly DayMetrics[]) {
  const revenue = days.reduce((sum, d) => sum + d.posRevenue + d.eatclubRevenue, 0);
  const covers = days.reduce((sum, d) => sum + d.covers, 0);
  return {
    revenue: roundTo(revenue, 2),
    average: Math.round(revenue / DAYS_IN_WEEK),
    covers,
  };
}

function metricsFor(
  dates: readonly string[],
  byDate: ReadonlyMap<string, DayMetrics>,
): DayMetrics[] {
  return dates.map((date) => byDate.get(date) ?? EMPTY_DAY);
}

export function buildRevenueTrend({
  weekStart,
  metrics,
  events,
}: RevenueTrendInput): RevenueTrendResponse {
  const previousStart = addDays(weekStart, -DAYS_IN_WEEK);
  const currentDates = weekDays(weekStart);
  const previousDates = weekDays(previousStart);

  const byDate = new Map(
    metrics.map(({ date, posRevenue, eatclubRevenue, labourCost, covers }) => [
      date,
      { posRevenue, eatclubRevenue, labourCost, covers },
    ]),
  );
  const current = metricsFor(currentDates, byDate);
  const previous = metricsFor(previousDates, byDate);

  const days: RevenueTrendDay[] = currentDates.map((date, i) => ({
    dayLabel: dayLabel(date),
    date,
    current: current[i]!,
    previous: previous[i]!,
    events: events
      .filter((event) => event.date === date)
      .map(({ impact, title, description }) => ({
        impact,
        title,
        description: description ?? null,
      })),
  }));

  const now = weekTotals(current);
  const before = weekTotals(previous);

  return {
    week: { start: weekStart, end: currentDates.at(-1)! },
    previous: { start: previousStart, end: previousDates.at(-1)! },
    days,
    summary: {
      totalRevenue: summaryValue(now.revenue, before.revenue),
      averagePerDay: summaryValue(now.average, before.average),
      totalCovers: summaryValue(now.covers, before.covers),
    },
  };
}
