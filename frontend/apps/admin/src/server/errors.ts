import type { ErrorCode, FieldErrors } from '@frontend/api-client';

/**
 * Domain errors raised by the data sources (mock or api), so callers never depend on which one answered.
 * Server Actions turn them into an `ActionState`; the mock Route Handlers into the backend's error body.
 * Each carries the backend `code` it corresponds to (backend/docs/API.md → Errors).
 */
export abstract class DomainError extends Error {
  abstract readonly status: number;
  abstract readonly code: ErrorCode;
}

export class NotFoundError extends DomainError {
  override readonly name = 'NotFoundError';
  readonly status = 404;
  constructor(
    message = 'Not found',
    readonly code: ErrorCode = 'NOT_FOUND',
  ) {
    super(message);
  }
}

export class ConflictError extends DomainError {
  override readonly name = 'ConflictError';
  readonly status = 409;
  constructor(
    message = 'Conflict',
    readonly code: ErrorCode = 'CONFLICT',
  ) {
    super(message);
  }
}

/** No valid session: expired or revoked access token, bad credentials, or a refresh token that was
 * invalid, expired or replayed (`REFRESH_TOKEN_REUSED`: the session was revoked as a precaution). */
export class UnauthorizedError extends DomainError {
  override readonly name = 'UnauthorizedError';
  readonly status = 401;
  constructor(
    message = 'Unauthorized',
    readonly code:
      | 'UNAUTHORIZED'
      | 'INVALID_CREDENTIALS'
      | 'ACCESS_TOKEN_EXPIRED'
      | 'INVALID_REFRESH_TOKEN'
      | 'REFRESH_TOKEN_REUSED' = 'UNAUTHORIZED',
  ) {
    super(message);
  }
}

/** The backend refused the role (e.g. it was downgraded after the session started). */
export class ForbiddenError extends DomainError {
  override readonly name = 'ForbiddenError';
  readonly status = 403;
  readonly code = 'FORBIDDEN';
  constructor(message = 'Forbidden') {
    super(message);
  }
}

/** Too many logins: locked out for this email + IP (`LOGIN_LOCKED`) or throttled per IP. */
export class TooManyAttemptsError extends DomainError {
  override readonly name = 'TooManyAttemptsError';
  readonly status = 429;
  constructor(
    readonly retryAfterSeconds: number,
    message = 'Too many login attempts. Please try again later.',
    readonly code: 'LOGIN_LOCKED' | 'TOO_MANY_REQUESTS' = 'LOGIN_LOCKED',
  ) {
    super(message);
  }
}

/** Input the backend rejected (`VALIDATION_FAILED`), with field path → messages. */
export class ValidationError extends DomainError {
  override readonly name = 'ValidationError';
  readonly status = 400;
  readonly code = 'VALIDATION_FAILED';
  constructor(
    readonly details: FieldErrors,
    message = 'Validation failed',
  ) {
    super(message);
  }
}
