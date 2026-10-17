/**
 * Machine-readable error codes, returned as `code` in every error body. Clients branch on these,
 * never on the human `error` message (which may change). Add a code here before using it.
 */
export const ErrorCode = {
  // Generic (mapped from HTTP status when no specific code applies)
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_JSON: 'INVALID_JSON',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // Domain
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCESS_TOKEN_EXPIRED: 'ACCESS_TOKEN_EXPIRED',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  REFRESH_TOKEN_REUSED: 'REFRESH_TOKEN_REUSED',
  LOGIN_LOCKED: 'LOGIN_LOCKED',
  DAILY_METRIC_NOT_FOUND: 'DAILY_METRIC_NOT_FOUND',
  DAILY_METRIC_DATE_TAKEN: 'DAILY_METRIC_DATE_TAKEN',
  EVENT_NOT_FOUND: 'EVENT_NOT_FOUND',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Fallback code for an HTTP status (Nest built-in exceptions, router 404, body-parser…). */
export function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.BAD_REQUEST;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 409:
      return ErrorCode.CONFLICT;
    case 413:
      return ErrorCode.PAYLOAD_TOO_LARGE;
    case 429:
      return ErrorCode.TOO_MANY_REQUESTS;
    case 503:
      return ErrorCode.SERVICE_UNAVAILABLE;
    default:
      return status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST;
  }
}
