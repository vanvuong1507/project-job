import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatNumber,
  formatPercentChange,
  formatThousands,
  getTrend,
} from './format';

describe('formatCurrency', () => {
  it('formats whole dollars with grouping', () => {
    expect(formatCurrency(15974)).toBe('$15,974');
    expect(formatCurrency(2281.71)).toBe('$2,282');
  });
});

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(871)).toBe('871');
    expect(formatNumber(14982.5)).toBe('14,982.5');
  });
});

describe('formatThousands', () => {
  it.each([
    [0, '0k'],
    [750, '0.75k'],
    [1500, '1.5k'],
    [2250, '2.25k'],
    [3000, '3k'],
  ])('%d → %s', (input, expected) => {
    expect(formatThousands(input)).toBe(expected);
  });
});

describe('formatPercentChange', () => {
  it('always shows the sign and one decimal', () => {
    expect(formatPercentChange(6.6)).toBe('+6.6%');
    expect(formatPercentChange(-2)).toBe('-2.0%');
    expect(formatPercentChange(0)).toBe('0.0%');
  });

  it('returns null when there is nothing to compare', () => {
    expect(formatPercentChange(null)).toBeNull();
    expect(formatPercentChange(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('getTrend', () => {
  it('treats zero as positive and null as neutral', () => {
    expect(getTrend(6.6)).toBe('positive');
    expect(getTrend(0)).toBe('positive');
    expect(getTrend(-0.1)).toBe('negative');
    expect(getTrend(null)).toBe('neutral');
  });
});
