import { describe, expect, it } from 'vitest';
import { actionErrorFor } from './action-errors';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyAttemptsError,
  UnauthorizedError,
  ValidationError,
} from './errors';

const messages = {
  forbidden: 'events.forbidden',
  invalid: 'events.fixFields',
  gone: 'events.gone',
};

describe('actionErrorFor', () => {
  it('maps domain errors to form messages', () => {
    expect(actionErrorFor(new UnauthorizedError(), messages)?.message).toBe('auth.sessionExpired');
    expect(actionErrorFor(new ForbiddenError(), messages)?.message).toBe('events.forbidden');
    expect(actionErrorFor(new NotFoundError(), messages)?.message).toBe('events.gone');
  });

  it('rounds a lockout up to whole minutes', () => {
    expect(actionErrorFor(new TooManyAttemptsError(61), messages)).toEqual({
      status: 'error',
      message: 'auth.tooManyAttempts',
      messageValues: { minutes: 2 },
    });
  });

  it('keeps the first message per field from the backend', () => {
    const error = new ValidationError({ 'days.3.covers': ['Must be a whole number', 'Too big'] });
    expect(actionErrorFor(error, messages)).toEqual({
      status: 'error',
      message: 'events.fixFields',
      fieldErrors: { 'days.3.covers': 'Must be a whole number' },
    });
  });

  it('leaves unexpected errors (and not-found without a message) to the caller', () => {
    expect(actionErrorFor(new Error('boom'), messages)).toBeNull();
    expect(actionErrorFor(new ConflictError(), messages)).toBeNull();
    expect(actionErrorFor(new NotFoundError(), { forbidden: 'x', invalid: 'y' })).toBeNull();
  });
});
