import type { RevenueTrendDay } from '@frontend/api-client';
import { describe, expect, it } from 'vitest';
import { chartMax, tallestBar, toChartRows } from './chart-data';

const day: RevenueTrendDay = {
  dayLabel: 'Sat',
  date: '2026-10-17',
  current: { posRevenue: 2180, eatclubRevenue: 720, labourCost: 850, covers: 150 },
  previous: { posRevenue: 1940, eatclubRevenue: 680, labourCost: 3000, covers: 140 },
  events: [],
};

const all = () => true;

describe('toChartRows', () => {
  it('flattens current and previous metrics per series', () => {
    expect(toChartRows([day])[0]).toMatchObject({
      dayLabel: 'Sat',
      pos: 2180,
      eatclub: 720,
      labour: 850,
      posPrev: 1940,
      eatclubPrev: 680,
      labourPrev: 3000,
    });
  });
});

describe('tallestBar / chartMax', () => {
  const [row] = toChartRows([day]);

  it('sums stacked revenue and ignores the previous period when not comparing', () => {
    expect(tallestBar(row!, { compare: false, isVisible: all })).toBe(2900);
  });

  it('includes previous bars when comparing', () => {
    expect(tallestBar(row!, { compare: true, isVisible: all })).toBe(3000);
  });

  it('only counts visible series', () => {
    const onlyEatclub = (key: string) => key === 'eatclub';
    expect(tallestBar(row!, { compare: true, isVisible: onlyEatclub })).toBe(720);
    expect(chartMax([], { compare: true, isVisible: all })).toBe(0);
  });
});
