import type { ZodError } from 'zod';

type MessageValues = Record<string, string | number>;

/**
 * Result of a Server Action, consumed with `useActionState`. Serializable (no class instances).
 * `fieldErrors` keys are dotted paths (`email`, `days.3.covers`) so forms can map them to inputs.
 */
export type ActionState =
  | { status: 'idle' }
  | { status: 'success'; message?: string; messageValues?: MessageValues }
  | {
      status: 'error';
      /** i18n key (e.g. `auth.invalidCredentials`), translated by the form with `useMessage`. */
      message: string;
      messageValues?: MessageValues;
      fieldErrors?: Record<string, string>;
      /** Submitted (non-secret) values, so the form can restore them: React resets forms after an action. */
      values?: Record<string, string>;
    };

export const IDLE: ActionState = { status: 'idle' };

/** First message per field (dotted path) from a zod error. */
export function fieldErrorsOf(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) result[issue.path.join('.') || '_'] ??= issue.message;
  return result;
}

export function fieldErrorFor(state: ActionState, field: string): string | undefined {
  return state.status === 'error' ? state.fieldErrors?.[field] : undefined;
}

export function submittedValue(state: ActionState, field: string): string | undefined {
  return state.status === 'error' ? state.values?.[field] : undefined;
}
