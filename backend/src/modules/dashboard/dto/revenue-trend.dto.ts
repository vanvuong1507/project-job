import { z } from 'zod';
import { isoDateSchema, weekStartSchema } from '../../../common/validation/schemas.js';
import { IMPACT_TYPES } from '../../events/events.constants.js';

/**
 * `GET /api/dashboard/revenue-trend` (spec §1.2). Mirrors the frontend's `@frontend/api-client`
 * `types/dashboard.ts` — change both together. The schemas document the API (Swagger) and are
 * asserted against real responses in the e2e tests.
 */

export const revenueTrendQuerySchema = z.object({
  weekStart: z
    .preprocess((value) => (value === '' ? undefined : value), weekStartSchema.optional())
    .meta({ description: 'Monday of the week. Omitted → the latest week that has data.' }),
});

const amount = z.number().meta({ example: 1720 });

export const dateRangeSchema = z.object({ start: isoDateSchema, end: isoDateSchema });

export const dayMetricsResponseSchema = z.object({
  posRevenue: amount,
  eatclubRevenue: amount,
  labourCost: amount,
  covers: z.number().int().meta({ example: 118 }),
});

export const dayEventSchema = z.object({
  impact: z.enum(IMPACT_TYPES),
  title: z.string().meta({ example: 'Heavy rain' }),
  description: z.string().nullable(),
});

export const revenueTrendDaySchema = z.object({
  dayLabel: z.enum(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']),
  date: isoDateSchema,
  current: dayMetricsResponseSchema,
  previous: dayMetricsResponseSchema.meta({ description: 'Same weekday of the previous week' }),
  events: z.array(dayEventSchema),
});

export const summaryValueSchema = z.object({
  current: z.number(),
  previous: z.number(),
  changePct: z
    .number()
    .nullable()
    .meta({ description: 'Percent change, 1 decimal; null when previous is 0', example: 6.6 }),
});

export const revenueTrendResponseSchema = z.object({
  week: dateRangeSchema,
  previous: dateRangeSchema.meta({ description: 'The 7 days before `week`' }),
  days: z
    .array(revenueTrendDaySchema)
    .length(7)
    .meta({ description: 'Always Mon → Sun, zero-filled' }),
  summary: z.object({
    totalRevenue: summaryValueSchema.meta({ description: 'Σ POS + Eatclub' }),
    averagePerDay: summaryValueSchema.meta({ description: 'Total / 7, whole dollars' }),
    totalCovers: summaryValueSchema,
  }),
});

export type DayMetrics = z.infer<typeof dayMetricsResponseSchema>;
export type DayEvent = z.infer<typeof dayEventSchema>;
export type RevenueTrendDay = z.infer<typeof revenueTrendDaySchema>;
export type SummaryValue = z.infer<typeof summaryValueSchema>;
export type RevenueTrendResponse = z.infer<typeof revenueTrendResponseSchema>;
