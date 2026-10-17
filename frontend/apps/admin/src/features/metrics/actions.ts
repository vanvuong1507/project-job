'use server';

import { revalidatePath } from 'next/cache';
import { fieldErrorsOf, type ActionState } from '@/lib/action-state';
import { weekStartSchema } from '@/lib/validation';
import { actionErrorFor } from '@/server/action-errors';
import { authorize } from '@/server/authz';
import { logger } from '@/server/logger';
import { upsertWeek } from '@/server/metrics';
import { rowsFromFormData, toNumbers } from './lib/metrics-form';
import { weekUpsertSchema } from './schemas';

/**
 * Saves all 7 days of a week. Bound to `weekStart` by the form: `saveWeekAction.bind(null, weekStart)`.
 * Authorizes and validates on the server — the client checks are only for fast feedback.
 */
export async function saveWeekAction(
  weekStart: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await authorize('metrics:write');
  if (!auth.ok) {
    logger.warn('save week denied', { action: 'saveWeek', reason: auth.reason, weekStart });
    return {
      status: 'error',
      message: auth.reason === 'forbidden' ? 'metrics.forbidden' : 'auth.sessionExpired',
    };
  }

  const week = weekStartSchema.safeParse(weekStart);
  const parsed = weekUpsertSchema.safeParse({ days: rowsFromFormData(formData).map(toNumbers) });
  if (!week.success || !parsed.success) {
    return {
      status: 'error',
      message: 'metrics.fixValues',
      fieldErrors: parsed.success ? {} : fieldErrorsOf(parsed.error),
    };
  }

  try {
    await upsertWeek(week.data, parsed.data.days);
  } catch (error) {
    const state = actionErrorFor(error, {
      forbidden: 'metrics.forbidden',
      invalid: 'metrics.fixValues',
    });
    if (state) return state;
    throw error;
  }
  logger.info('week saved', { action: 'saveWeek', userId: auth.user.id, weekStart });
  revalidatePath('/');
  return { status: 'success', message: 'metrics.saved' };
}
