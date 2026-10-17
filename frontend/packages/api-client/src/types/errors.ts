/**
 * Error contract of the backend (backend/docs/API.md → Errors). Mirrors
 * `backend/src/common/exceptions/error-codes.ts`; keep the two lists in sync.
 */

/** Machine-readable `code` of every error body. Branch on it, never on the human `error` message. */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_FAILED'
  | 'INVALID_JSON'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'ROUTE_NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'ACCESS_TOKEN_EXPIRED'
  | 'INVALID_REFRESH_TOKEN'
  | 'REFRESH_TOKEN_REUSED'
  | 'LOGIN_LOCKED'
  | 'DAILY_METRIC_NOT_FOUND'
  | 'DAILY_METRIC_DATE_TAKEN'
  | 'EVENT_NOT_FOUND';

/** Client-side failures that never reached the backend (`ApiError.status === 0`). */
export type TransportErrorCode = 'NETWORK_ERROR' | 'TIMEOUT';

/** `{ "days.0.covers": ["Must be a whole number"] }`: dotted field path → messages. */
export type FieldErrors = Record<string, string[]>;

/** Body of every 4xx/5xx response. */
export interface ApiErrorBody {
  statusCode: number;
  code: ErrorCode;
  /** Human-readable message (English); not for branching. */
  error: string;
  /** Present for `VALIDATION_FAILED`. */
  details?: FieldErrors;
  /** Same value as the `X-Request-Id` response header; quote it when reporting a problem. */
  requestId: string;
  path: string;
  timestamp: string;
}
