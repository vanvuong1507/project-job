import { z } from 'zod';
import { DAYS_IN_WEEK } from '@/lib/week';
import { coversSchema, isoDateSchema, moneySchema } from '@/lib/validation';

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
  days: z.array(dayMetricsSchema).length(DAYS_IN_WEEK, 'validation.sevenDays'),
});

export type DayMetricsInput = z.infer<typeof dayMetricsSchema>;
export type DailyMetricInput = z.infer<typeof dailyMetricInputSchema>;
export type WeekUpsertInput = z.infer<typeof weekUpsertSchema>;
