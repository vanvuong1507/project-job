import { ApiError } from './errors';
import type { Interceptor, RequestContext } from './interceptors';

type QueryValue = string | number | boolean | null | undefined;

export interface RetryOptions {
  /** Total attempts including the first one. */
  attempts: number;
  /** Delay before retry n is `baseDelayMs * 2^(n-1)`. Default 200ms. */
  baseDelayMs?: number;
  /** Which failures to retry. Default: network errors/timeouts and 502/503/504. */
  retryOn?: (error: ApiError) => boolean;
}

export interface HttpClientOptions {
  baseUrl: string;
  /** Send cookies cross-origin (needed for the admin's httpOnly JWT cookie). */
  withCredentials?: boolean;
  /** Abort requests that take longer than this. Default 15s. */
  timeoutMs?: number;
  interceptors?: readonly Interceptor[];
  /** Retries apply to idempotent methods (GET, HEAD) only. */
  retry?: RetryOptions;
  /** Injectable fetch (tests, instrumented server fetch). Defaults to the global one. */
  fetch?: typeof fetch;
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  body?: unknown;
  query?: Record<string, QueryValue>;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const IDEMPOTENT = new Set(['GET', 'HEAD']);
const RETRYABLE_STATUS = new Set([502, 503, 504]);

const defaultRetryOn = (error: ApiError) =>
  error.status === 0 || RETRYABLE_STATUS.has(error.status);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildUrl(baseUrl: string, path: string, query: RequestOptions['query']): URL {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return url;
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    if (!res.ok) return null; // non-JSON error page — status is enough
    throw new ApiError(res.status, 'Invalid JSON in response');
  }
}

export function createHttpClient({
  baseUrl,
  withCredentials = false,
  timeoutMs: defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
  interceptors = [],
  retry,
  fetch: fetchImpl = (...args) => fetch(...args),
}: HttpClientOptions) {
  async function attempt<T>(
    method: string,
    url: URL,
    attemptNumber: number,
    { body, headers, signal, timeoutMs = defaultTimeoutMs, ...init }: Omit<RequestOptions, 'query'>,
  ): Promise<T> {
    const context: RequestContext = {
      method,
      url,
      headers: new Headers(headers),
      attempt: attemptNumber,
    };
    if (!context.headers.has('Accept')) context.headers.set('Accept', 'application/json');
    if (body !== undefined) context.headers.set('Content-Type', 'application/json');
    for (const interceptor of interceptors) await interceptor.request?.(context);

    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    try {
      let res: Response;
      try {
        res = await fetchImpl(context.url, {
          credentials: withCredentials ? 'include' : 'same-origin',
          ...init,
          method,
          headers: context.headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
        });
      } catch (cause) {
        const timedOut = timeoutSignal.aborted;
        const reason = timedOut ? `Request timed out after ${timeoutMs}ms` : 'Network error';
        throw new ApiError(0, reason, undefined, {
          cause,
          code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
        });
      }

      const data = await parseBody(res);
      if (!res.ok) throw ApiError.fromResponse(res, data);
      for (const interceptor of interceptors) await interceptor.response?.(res, context);
      return data as T;
    } catch (error) {
      let apiError =
        error instanceof ApiError
          ? error
          : new ApiError(0, 'Request failed', undefined, { cause: error });
      for (const interceptor of interceptors) {
        if (interceptor.error) apiError = await interceptor.error(apiError, context);
      }
      throw apiError;
    }
  }

  async function request<T>(
    method: string,
    path: string,
    { query, ...options }: RequestOptions = {},
  ): Promise<T> {
    const url = buildUrl(baseUrl, path, query);
    const maxAttempts = retry && IDEMPOTENT.has(method) ? Math.max(1, retry.attempts) : 1;
    const retryOn = retry?.retryOn ?? defaultRetryOn;

    for (let n = 1; ; n++) {
      try {
        return await attempt<T>(method, new URL(url), n, options);
      } catch (error) {
        const callerAborted = options.signal?.aborted ?? false;
        if (n >= maxAttempts || callerAborted || !(error instanceof ApiError) || !retryOn(error))
          throw error;
        await sleep((retry?.baseDelayMs ?? 200) * 2 ** (n - 1));
      }
    }
  }

  return {
    get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>('POST', path, { ...options, body }),
    put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>('PUT', path, { ...options, body }),
    delete: <T = void>(path: string, options?: RequestOptions) =>
      request<T>('DELETE', path, options),
  };
}

export type HttpClient = ReturnType<typeof createHttpClient>;
