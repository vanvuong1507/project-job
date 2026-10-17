import 'server-only';
import type { ActionState } from '@/lib/action-state';
import {
  ForbiddenError,
  NotFoundError,
  TooManyAttemptsError,
  UnauthorizedError,
  ValidationError,
} from './errors';

type ErrorState = Extract<ActionState, { status: 'error' }>;

export interface ActionErrorMessages {
  /** i18n key when the role may not do this. */
  forbidden: string;
  /** i18n key when the input was rejected (field messages come from the data source). */
  invalid: string;
  /** i18n key when the target no longer exists; omit to rethrow. */
  gone?: string;
}

/**
 * Turns a domain error from the data source into the `ActionState` a form shows, or `null` for an
 * unexpected error (rethrow it: the error boundary and `onRequestError` handle it). The page-level
 * `authorize()` check makes most of these rare: they cover races such as a session expiring or a
 * role changing between the check and the backend call.
 */
export function actionErrorFor(error: unknown, messages: ActionErrorMessages): ErrorState | null {
  if (error instanceof UnauthorizedError)
    return { status: 'error', message: 'auth.sessionExpired' };
  if (error instanceof ForbiddenError) return { status: 'error', message: messages.forbidden };
  if (error instanceof NotFoundError && messages.gone)
    return { status: 'error', message: messages.gone };
  if (error instanceof TooManyAttemptsError) {
    return {
      status: 'error',
      message: 'auth.tooManyAttempts',
      messageValues: { minutes: Math.max(1, Math.ceil(error.retryAfterSeconds / 60)) },
    };
  }
  if (error instanceof ValidationError) {
    const fieldErrors: Record<string, string> = {};
    for (const [field, [first]] of Object.entries(error.details ?? {}))
      if (first) fieldErrors[field] = first;
    return { status: 'error', message: messages.invalid, fieldErrors };
  }
  return null;
}
