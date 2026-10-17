import 'server-only';
import type { DayMetrics, ImpactType } from '@frontend/api-client';
import { z } from 'zod';
import dailyMetricsJson from './fixtures/daily-metrics.json';
import eventsJson from './fixtures/events.json';
import { parseIsoDate } from '@/lib/dates';

/** Fixtures are validated once at load, so a typo in the JSON fails loudly instead of rendering wrong numbers. */

const isoDate = z.string().refine((value) => parseIsoDate(value) !== null, 'Expected YYYY-MM-DD');
const amount = z.number().nonnegative();

const dailyMetricSchema = z.object({
  date: isoDate,
  posRevenue: amount,
  eatclubRevenue: amount,
  labourCost: amount,
  covers: z.number().int().nonnegative(),
});

const eventSchema = z.object({
  date: isoDate,
  impact: z.enum(['POSITIVE', 'NEGATIVE'] satisfies [ImpactType, ImpactType]),
  title: z.string().min(1).max(120),
  description: z.string().nullish(),
});

export type DailyMetricRecord = z.infer<typeof dailyMetricSchema> & DayMetrics;
export type EventRecord = z.infer<typeof eventSchema>;

export interface MockDataset {
  dailyMetrics: readonly DailyMetricRecord[];
  events: readonly EventRecord[];
}

export const fixtures: MockDataset = {
  dailyMetrics: z.array(dailyMetricSchema).parse(dailyMetricsJson),
  events: z.array(eventSchema).parse(eventsJson),
};
