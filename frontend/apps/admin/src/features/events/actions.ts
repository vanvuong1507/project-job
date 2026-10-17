'use server';

import { revalidatePath } from 'next/cache';
import { fieldErrorsOf, type ActionState } from '@/lib/action-state';
import type { Permission } from '@/lib/permissions';
import { authorize } from '@/server/authz';
import { actionErrorFor } from '@/server/action-errors';
import { NotFoundError } from '@/server/errors';
import { createEvent, deleteEvent, updateEvent } from '@/server/events';
import { logger } from '@/server/logger';
import { eventInputSchema } from './schemas';

/** Event Server Actions: authorize → validate on the server → DAL → revalidate /events. */

const ERRORS = { forbidden: 'events.forbidden', invalid: 'events.fixFields', gone: 'events.gone' };

const DENIED: Record<'unauthenticated' | 'forbidden', string> = {
  unauthenticated: 'auth.sessionExpired',
  forbidden: 'events.forbidden',
};

async function guard(permission: Permission, action: string) {
  const auth = await authorize(permission);
  if (!auth.ok) logger.warn('event action denied', { action, reason: auth.reason });
  return auth;
}

function readForm(formData: FormData) {
  const values = {
    date: String(formData.get('date') ?? ''),
    impact: String(formData.get('impact') ?? ''),
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
  };
  return { values, parsed: eventInputSchema.safeParse(values) };
}

async function save(id: string | null, formData: FormData): Promise<ActionState> {
  const action = id ? 'updateEvent' : 'createEvent';
  const auth = await guard('events:write', action);
  if (!auth.ok) return { status: 'error', message: DENIED[auth.reason] };

  const { values, parsed } = readForm(formData);
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'events.fixFields',
      fieldErrors: fieldErrorsOf(parsed.error),
      values,
    };
  }

  try {
    if (id) await updateEvent(id, parsed.data);
    else await createEvent(parsed.data);
  } catch (error) {
    const state = actionErrorFor(error, ERRORS);
    if (state) return { ...state, values };
    throw error;
  }
  logger.info('event saved', { action, userId: auth.user.id, eventId: id });
  revalidatePath('/events');
  return { status: 'success', message: id ? 'events.updated' : 'events.added' };
}

export async function createEventAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return save(null, formData);
}

export async function updateEventAction(
  id: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return save(id, formData);
}

export async function deleteEventAction(id: string): Promise<ActionState> {
  const auth = await guard('events:delete', 'deleteEvent');
  if (!auth.ok) return { status: 'error', message: DENIED[auth.reason] };
  try {
    await deleteEvent(id);
  } catch (error) {
    if (!(error instanceof NotFoundError)) {
      const state = actionErrorFor(error, ERRORS);
      if (state) return state;
      throw error;
    }
    // Already gone: the goal is reached.
  }
  logger.info('event deleted', { action: 'deleteEvent', userId: auth.user.id, eventId: id });
  revalidatePath('/events');
  return { status: 'success', message: 'events.deleted' };
}
