import { z } from 'zod';
import { ErrorCode } from '../exceptions/error-codes.js';
import { isMonday } from '../utils/dates.js';

/**
 * Shared zod building blocks — they validate requests *and* generate the OpenAPI docs.
 * Messages match the admin app's client-side validation (`frontend/apps/admin/src/schemas`).
 */

/** Real calendar date `YYYY-MM-DD` (rejects 2026-02-30). `abort` keeps later checks from piling on. */
export const isoDateSchema = z.iso
  .date({ error: 'Use a valid date (YYYY-MM-DD)', abort: true })
  .meta({ example: '2026-10-12' });

export const weekStartSchema = isoDateSchema
  .refine(isMonday, 'The week must start on a Monday')
  .meta({ description: 'Monday of the week (YYYY-MM-DD)', example: '2026-10-12' });

/** Non-negative amount with at most 2 decimals (currency), within numeric(12,2). */
export const moneySchema = z
  .number({ error: 'Enter a number' })
  .nonnegative('Must be 0 or more')
  .max(9_999_999_999.99, 'Value is too large')
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9,
    'Use at most 2 decimals',
  )
  .meta({ description: 'Amount in USD, at most 2 decimals', example: 1720.5 });

export const coversSchema = z
  .number({ error: 'Enter a number' })
  .int('Must be a whole number')
  .nonnegative('Must be 0 or more')
  .max(2_147_483_647, 'Value is too large')
  .meta({ example: 118 });

export const uuidSchema = z
  .uuid('Invalid id')
  .meta({ example: '0b4d844d-3e61-4e33-b251-6bcf7f0f1925' });

export const timestampSchema = z.iso.datetime().meta({ example: '2026-10-16T07:27:24.646Z' });

/** `?from=&to=` — both optional, inclusive. */
export const dateRangeQuerySchema = z
  .object({
    from: isoDateSchema.optional().meta({ description: 'First date (inclusive)' }),
    to: isoDateSchema.optional().meta({ description: 'Last date (inclusive)' }),
  })
  .refine(({ from, to }) => !from || !to || from <= to, {
    message: '`from` must be on or before `to`',
    path: ['to'],
  });

export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;

/** Body of every error response (rendered by HttpExceptionFilter). */
export const errorResponseSchema = z.object({
  statusCode: z.number().int().meta({ example: 400 }),
  code: z.enum(Object.values(ErrorCode) as [ErrorCode, ...ErrorCode[]]).meta({
    description: 'Machine-readable error code — branch on this, not on `error`',
    example: 'VALIDATION_FAILED',
  }),
  error: z.string().meta({ description: 'Human-readable message', example: 'Validation failed' }),
  details: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .meta({
      description: 'Validation errors by dotted field path (VALIDATION_FAILED only)',
      example: { 'days.0.covers': ['Must be 0 or more'] },
    }),
  requestId: z.string().meta({ description: 'Same as the X-Request-Id response header' }),
  path: z.string().meta({ example: '/api/admin/weeks/2026-10-12' }),
  timestamp: timestampSchema,
});
