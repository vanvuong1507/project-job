import { z } from 'zod';
import { isoDateSchema } from '@/lib/validation';

export const IMPACTS = ['POSITIVE', 'NEGATIVE'] as const;

/** Body of POST/PUT /api/admin/events. */
export const eventInputSchema = z.object({
  date: isoDateSchema,
  impact: z.enum(IMPACTS, { error: 'validation.impact' }),
  title: z.string().trim().min(1, 'validation.titleRequired').max(120, 'validation.titleMax'),
  description: z
    .string()
    .trim()
    .max(500, 'validation.descriptionMax')
    .nullish()
    .transform((value) => value || null),
});

export type EventInput = z.input<typeof eventInputSchema>;
export type EventData = z.output<typeof eventInputSchema>;
