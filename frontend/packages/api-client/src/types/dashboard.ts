/** `GET /api/dashboard/revenue-trend` — docs/US-TASK-DETAIL.md §1.2. Dates are `YYYY-MM-DD`. */

export type ImpactType = 'POSITIVE' | 'NEGATIVE';

export interface DateRange {
  start: string;
  end: string;
}

export interface DayMetrics {
  posRevenue: number;
  eatclubRevenue: number;
  labourCost: number;
  covers: number;
}

export interface DayEvent {
  impact: ImpactType;
  title: string;
  description?: string | null;
}

export interface RevenueTrendDay {
  dayLabel: string;
  date: string;
  current: DayMetrics;
  previous: DayMetrics;
  events: DayEvent[];
}

export interface SummaryValue {
  current: number;
  previous: number;
  /** `null` when the previous value is 0. */
  changePct: number | null;
}

export interface RevenueTrendResponse {
  week: DateRange;
  previous: DateRange;
  days: RevenueTrendDay[];
  summary: {
    totalRevenue: SummaryValue;
    averagePerDay: SummaryValue;
    totalCovers: SummaryValue;
  };
}
