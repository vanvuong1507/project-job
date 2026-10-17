import { describe, expect, it } from 'vitest';
import type { MockDataset } from './data';
import { InvalidWeekStartError, parseWeekStart } from '@/features/revenue-trend/lib/week-start';
import { buildRevenueTrend } from './build-revenue-trend';

describe('buildRevenueTrend (fixtures)', () => {
  const trend = buildRevenueTrend();

  it('defaults to the latest week with data and its previous week', () => {
    expect(trend.week).toEqual({ start: '2026-10-12', end: '2026-10-18' });
    expect(trend.previous).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(trend.days.map((d) => d.dayLabel)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ]);
  });

  it('reproduces the reference video summary', () => {
    expect(trend.summary).toEqual({
      totalRevenue: { current: 15974, previous: 14982, changePct: 6.6 },
      averagePerDay: { current: 2282, previous: 2140, changePct: 6.6 },
      totalCovers: { current: 871, previous: 820, changePct: 6.2 },
    });
  });

  it('attaches Fri negative and Sat positive events', () => {
    const impacts = trend.days.map((d) => d.events.map((e) => e.impact));
    expect(impacts[4]).toEqual(['NEGATIVE']);
    expect(impacts[5]).toEqual(['POSITIVE']);
  });
});

describe('buildRevenueTrend (edge cases)', () => {
  const dataset: MockDataset = {
    dailyMetrics: [
      { date: '2026-10-13', posRevenue: 100, eatclubRevenue: 40, labourCost: 50, covers: 10 },
    ],
    events: [],
  };

  it('fills missing days with zeros and returns null change without a previous value', () => {
    const trend = buildRevenueTrend('2026-10-12', dataset);

    expect(trend.days).toHaveLength(7);
    expect(trend.days[0]?.current).toEqual({
      posRevenue: 0,
      eatclubRevenue: 0,
      labourCost: 0,
      covers: 0,
    });
    expect(trend.days[1]?.current.posRevenue).toBe(100);
    expect(trend.summary.totalRevenue).toEqual({ current: 140, previous: 0, changePct: null });
    expect(trend.summary.averagePerDay.current).toBe(20);
  });

  it('returns an all-zero week when there is no data', () => {
    const trend = buildRevenueTrend('2026-01-05', dataset);
    expect(trend.summary.totalRevenue).toEqual({ current: 0, previous: 0, changePct: null });
  });

  it('falls back to the current week when the dataset is empty', () => {
    const trend = buildRevenueTrend(
      undefined,
      { dailyMetrics: [], events: [] },
      () => '2026-10-16',
    );
    expect(trend.week.start).toBe('2026-10-12');
  });
});

describe('parseWeekStart', () => {
  it('accepts a Monday and treats empty as "latest"', () => {
    expect(parseWeekStart('2026-10-12')).toBe('2026-10-12');
    expect(parseWeekStart(undefined)).toBeUndefined();
    expect(parseWeekStart('')).toBeUndefined();
  });

  it.each(['2026-10-13', '2026-13-01', 'last-week'])('rejects %s', (value) => {
    expect(() => parseWeekStart(value)).toThrow(InvalidWeekStartError);
  });
});
