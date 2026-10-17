import { SEED_DAILY_METRICS, SEED_EVENTS } from '../../database/seeds/seed-data.js';
import { buildRevenueTrend, changePct, weekTotals } from './revenue-trend.builder.js';

describe('buildRevenueTrend', () => {
  const trend = buildRevenueTrend({
    weekStart: '2026-10-12',
    metrics: SEED_DAILY_METRICS,
    events: SEED_EVENTS,
  });

  it('reproduces the reference video numbers', () => {
    expect(trend.week).toEqual({ start: '2026-10-12', end: '2026-10-18' });
    expect(trend.previous).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(trend.summary).toEqual({
      totalRevenue: { current: 15974, previous: 14982, changePct: 6.6 },
      averagePerDay: { current: 2282, previous: 2140, changePct: 6.6 },
      totalCovers: { current: 871, previous: 820, changePct: 6.2 },
    });
  });

  it('pairs each day with the same weekday of the previous week', () => {
    expect(trend.days[0]).toMatchObject({
      dayLabel: 'Mon',
      date: '2026-10-12',
      current: { posRevenue: 1720, eatclubRevenue: 310, labourCost: 600, covers: 118 },
      previous: { posRevenue: 1540, eatclubRevenue: 290, labourCost: 520, covers: 110 },
    });
  });

  it('attaches only the current week’s events to their day', () => {
    expect(trend.days.map((d) => d.events.map((e) => e.impact))).toEqual([
      [],
      [],
      [],
      [],
      ['NEGATIVE'],
      ['POSITIVE'],
      [],
    ]);
    // 2026-10-09 belongs to the previous week and must not leak in.
    expect(trend.days.flatMap((d) => d.events).map((e) => e.title)).not.toContain(
      'School holidays begin',
    );
  });

  it('always returns 7 days, filling missing ones with zeros', () => {
    const empty = buildRevenueTrend({ weekStart: '2030-01-07', metrics: [], events: [] });
    expect(empty.days).toHaveLength(7);
    expect(empty.days.every((d) => d.current.covers === 0 && d.previous.posRevenue === 0)).toBe(
      true,
    );
    expect(empty.summary.totalRevenue).toEqual({ current: 0, previous: 0, changePct: null });
  });

  it('normalises a missing description to null', () => {
    const result = buildRevenueTrend({
      weekStart: '2026-10-12',
      metrics: [],
      events: [{ date: '2026-10-12', impact: 'POSITIVE', title: 'X', description: null }],
    });
    expect(result.days[0]!.events).toEqual([{ impact: 'POSITIVE', title: 'X', description: null }]);
  });
});

describe('summary maths', () => {
  it('rounds the change to one decimal and handles decreases', () => {
    expect(changePct(15974, 14982)).toBe(6.6);
    expect(changePct(90, 100)).toBe(-10);
    expect(changePct(1, 3)).toBe(-66.7);
  });

  it('returns null when there is no previous value', () => {
    expect(changePct(100, 0)).toBeNull();
  });

  it('keeps cents in the total and rounds the daily average to whole dollars', () => {
    const day = { posRevenue: 100.1, eatclubRevenue: 0.2, labourCost: 0, covers: 1 };
    expect(weekTotals(Array.from({ length: 7 }, () => day))).toEqual({
      revenue: 702.1,
      average: 100,
      covers: 7,
    });
  });
});
