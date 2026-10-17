import { describe, expect, it } from 'vitest';
import { weekStartSchema } from './validation';
import { eventInputSchema } from '@/features/events/schemas';
import { dailyMetricInputSchema, weekUpsertSchema } from '@/features/metrics/schemas';

const day = { posRevenue: 1720, eatclubRevenue: 310.5, labourCost: 600, covers: 118 };

describe('metrics schemas', () => {
  it('accepts valid values', () => {
    expect(dailyMetricInputSchema.safeParse({ ...day, date: '2026-10-12' }).success).toBe(true);
  });

  it.each([
    [{ posRevenue: -1 }, 'posRevenue', 'validation.nonNegative'],
    [{ eatclubRevenue: 10.123 }, 'eatclubRevenue', 'validation.decimals'],
    [{ covers: 1.5 }, 'covers', 'validation.integer'],
  ])('rejects %o', (override, field, message) => {
    const result = dailyMetricInputSchema.safeParse({ ...day, ...override, date: '2026-10-12' });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors[field as keyof typeof day]).toContain(message);
  });

  it('requires exactly 7 days for a week', () => {
    expect(weekUpsertSchema.safeParse({ days: Array(7).fill(day) }).success).toBe(true);
    expect(weekUpsertSchema.safeParse({ days: Array(6).fill(day) }).success).toBe(false);
  });

  it('only accepts Mondays as week starts', () => {
    expect(weekStartSchema.safeParse('2026-10-12').success).toBe(true);
    expect(weekStartSchema.safeParse('2026-10-13').success).toBe(false);
  });
});

describe('event schema', () => {
  const event = { date: '2026-10-17', impact: 'POSITIVE', title: '  Festival  ' };

  it('trims text and normalises an empty description to null', () => {
    expect(eventInputSchema.parse({ ...event, description: '' })).toEqual({
      date: '2026-10-17',
      impact: 'POSITIVE',
      title: 'Festival',
      description: null,
    });
  });

  it('enforces title rules', () => {
    expect(eventInputSchema.safeParse({ ...event, title: '   ' }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...event, title: 'x'.repeat(121) }).success).toBe(false);
  });
});
