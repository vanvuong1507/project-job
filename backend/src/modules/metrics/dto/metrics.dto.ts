import { z } from 'zod';
import type { DailyMetricEntity } from '../entities/daily-metric.entity.js';
import { DAYS_IN_WEEK } from '../../../common/utils/dates.js';
import {
  coversSchema,
  isoDateSchema,
  moneySchema,
  timestampSchema,
  uuidSchema,
  weekStartSchema,
} from '../../../common/validation/schemas.js';

export const dayMetricsSchema = z.object({
  posRevenue: moneySchema,
  eatclubRevenue: moneySchema,
  labourCost: moneySchema,
  covers: coversSchema,
});

/** Body of POST/PUT /api/admin/daily-metrics. */
export const dailyMetricInputSchema = dayMetricsSchema.extend({ date: isoDateSchema });

/** Body of PUT /api/admin/weeks/:weekStart — `days[0]` is Monday … `days[6]` is Sunday. */
export const weekUpsertSchema = z.object({
  days: z
    .array(dayMetricsSchema)
    .length(DAYS_IN_WEEK, `Provide exactly ${DAYS_IN_WEEK} days`)
    .meta({ description: 'Monday → Sunday' }),
});

/** A stored day, as returned by the admin API. Mirrors `@frontend/api-client` DailyMetric (+ timestamps). */
export const dailyMetricSchema = z.object({
  id: uuidSchema,
  date: isoDateSchema,
  ...dayMetricsSchema.shape,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const weekUpsertResponseSchema = z.object({
  weekStart: weekStartSchema,
  days: z.array(dailyMetricSchema).length(DAYS_IN_WEEK),
});

export type DayMetricsInput = z.infer<typeof dayMetricsSchema>;
export type DailyMetricInput = z.infer<typeof dailyMetricInputSchema>;
export type WeekUpsertInput = z.infer<typeof weekUpsertSchema>;

export type DailyMetricResponse = z.infer<typeof dailyMetricSchema>;
export type WeekUpsertResponse = z.infer<typeof weekUpsertResponseSchema>;

/** Entity → public shape. Explicit, so a new column never leaks into the API by accident. */
export function toDailyMetricResponse(entity: DailyMetricEntity): DailyMetricResponse {
  return {
    id: entity.id,
    date: entity.date,
    posRevenue: entity.posRevenue,
    eatclubRevenue: entity.eatclubRevenue,
    labourCost: entity.labourCost,
    covers: entity.covers,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
