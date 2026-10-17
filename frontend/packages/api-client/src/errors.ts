import type { ApiErrorBody, ErrorCode, TransportErrorCode } from './types/errors';

export interface ApiErrorOptions extends ErrorOptions {
  /** Backend `code`; defaults from the status (or `NETWORK_ERROR` when `status` is 0). */
  code?: ErrorCode | TransportErrorCode;
  /** Backend request id (body `requestId` / `X-Request-Id`), for correlating logs. */
  requestId?: string;
  /** Parsed `Retry-After` header (429/503). */
  retryAfterSeconds?: number;
}

const STATUS_CODES: Record<number, ErrorCode> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'TOO_MANY_REQUESTS',
  503: 'SERVICE_UNAVAILABLE',
};

/** Same fallback as the backend's `codeForStatus`, for bodies without a `code` (proxies, HTML pages). */
function codeForStatus(status: number): ErrorCode | TransportErrorCode {
  if (status === 0) return 'NETWORK_ERROR';
  return STATUS_CODES[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
}

function retryAfterOf(res: Response): number | undefined {
  const value = Number(res.headers.get('retry-after'));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly code: ErrorCode | TransportErrorCode;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;

  constructor(
    /** HTTP status; `0` when the request never got a response (network error, timeout, abort). */
    readonly status: number,
    message: string,
    /** Field errors (`VALIDATION_FAILED`) or any other `details` the backend sent. */
    readonly details?: unknown,
    { code, requestId, retryAfterSeconds, ...options }: ApiErrorOptions = {},
  ) {
    super(message, options);
    this.code = code ?? codeForStatus(status);
    this.requestId = requestId;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  static fromResponse(res: Response, body: unknown): ApiError {
    const { error, details, code, requestId } = (body ?? {}) as Partial<ApiErrorBody>;
    return new ApiError(res.status, error ?? (res.statusText || `HTTP ${res.status}`), details, {
      code,
      requestId: requestId ?? res.headers.get('x-request-id') ?? undefined,
      retryAfterSeconds: retryAfterOf(res),
    });
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
