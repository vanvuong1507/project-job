import type { ApiError } from './errors';

/** Mutable view of an outgoing request that interceptors may adjust. */
export interface RequestContext {
  readonly method: string;
  url: URL;
  headers: Headers;
  /** 1 for the first try, 2+ for retries. */
  readonly attempt: number;
}

/**
 * Cross-cutting request hooks, run in registration order:
 * `request` before each attempt, `response` after a successful status, `error` to transform a failure.
 */
export interface Interceptor {
  request?: (context: RequestContext) => void | Promise<void>;
  response?: (response: Response, context: RequestContext) => void | Promise<void>;
  error?: (error: ApiError, context: RequestContext) => ApiError | Promise<ApiError>;
}

/** Adds a correlation id (`x-request-id`) so a request can be traced across logs. */
export function requestIdInterceptor(
  generate: () => string = () => crypto.randomUUID(),
  header = 'x-request-id',
): Interceptor {
  return {
    request(context) {
      if (!context.headers.has(header)) context.headers.set(header, generate());
    },
  };
}

/** Adds headers computed per request, e.g. `Authorization` or `Accept-Language`. Existing headers win. */
export function headersInterceptor(
  getHeaders: (
    context: RequestContext,
  ) => HeadersInit | undefined | Promise<HeadersInit | undefined>,
): Interceptor {
  return {
    async request(context) {
      for (const [name, value] of new Headers(await getHeaders(context))) {
        if (!context.headers.has(name)) context.headers.set(name, value);
      }
    },
  };
}
