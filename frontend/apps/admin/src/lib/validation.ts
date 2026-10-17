/** Zod messages are i18n keys (`validation.*`), translated by the UI; API consumers get stable codes. */
import { z } from 'zod';
import { isIsoDate, isMonday } from '@/lib/week';

export const isoDateSchema = z.string().refine(isIsoDate, 'validation.date');

export const weekStartSchema = isoDateSchema.refine(isMonday, 'validation.monday');

/** Non-negative amount with at most 2 decimals (currency). */
export const moneySchema = z
  .number({ error: 'validation.number' })
  .nonnegative('validation.nonNegative')
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9, 'validation.decimals');

export const coversSchema = z
  .number({ error: 'validation.number' })
  .int('validation.integer')
  .nonnegative('validation.nonNegative');
