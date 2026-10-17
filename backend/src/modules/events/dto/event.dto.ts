import { z } from 'zod';
import type { EventImpactEntity } from '../entities/event-impact.entity.js';
import { isoDateSchema, timestampSchema, uuidSchema } from '../../../common/validation/schemas.js';
import { IMPACT_TYPES } from '../events.constants.js';

const impactSchema = z.enum(IMPACT_TYPES, { error: 'Choose an impact' });

/** Body of POST/PUT /api/admin/events. Text is trimmed; an empty description becomes `null`. */
export const eventInputSchema = z.object({
  date: isoDateSchema,
  impact: impactSchema,
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(120, 'Use at most 120 characters')
    .meta({ example: 'Local food festival' }),
  description: z
    .string()
    .trim()
    .max(500, 'Use at most 500 characters')
    .nullish()
    .transform((value) => value || null)
    .meta({ example: 'Festival crowds boosted dinner covers.' }),
});

export type EventInput = z.output<typeof eventInputSchema>;

/** A stored event, as returned by the admin API. Mirrors `@frontend/api-client` EventImpact (+ timestamps). */
export const eventImpactSchema = z.object({
  id: uuidSchema,
  date: isoDateSchema,
  impact: impactSchema,
  title: z.string(),
  description: z.string().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type EventImpactResponse = z.infer<typeof eventImpactSchema>;

/** Entity → public shape. Explicit, so a new column never leaks into the API by accident. */
export function toEventImpactResponse(entity: EventImpactEntity): EventImpactResponse {
  return {
    id: entity.id,
    date: entity.date,
    impact: entity.impact,
    title: entity.title,
    description: entity.description,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
