import 'server-only';
import {
  ApiError,
  createHttpClient,
  headersInterceptor,
  isApiError,
  requestIdInterceptor,
  type AdminUser,
  type DailyMetric,
  type EventImpact,
  type FieldErrors,
  type Interceptor,
} from '@frontend/api-client';
import { REFRESH_COOKIE, SESSION_COOKIE } from '@/lib/session';
import { parseSetCookies } from '../../auth/set-cookie';
import type { SessionTokens } from '../../auth/session-cookies';
import { forwardedClient } from '../../client-ip';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyAttemptsError,
  UnauthorizedError,
  ValidationError,
} from '../../errors';
import { logger } from '../../logger';
import type { ForwardedClient, Repositories } from '../../repositories';
import { getSessionToken } from '../../session';

/**
 * Repositories over the real backend (docs/US-TASK-DETAIL.md §1.2), server-side only.
 * Interceptors add a request id, the end user's IP (`X-Forwarded-For`, so the backend's per-IP login
 * throttling sees users rather than this server) and the session as `Authorization: Bearer`.
 * Backend errors become the same domain errors the mock raises, so callers don't care which source answered.
 */
export function createApiRepositories(baseUrl: string): Repositories {
  const common: Interceptor[] = [
    requestIdInterceptor(),
    headersInterceptor(async () => forwardedHeaders(await forwardedClient())),
  ];

  const client = createHttpClient({
    baseUrl,
    interceptors: [
      ...common,
      headersInterceptor(async () => {
        const token = await getSessionToken();
        return token ? { Authorization: `Bearer ${token}` } : undefined;
      }),
    ],
    retry: { attempts: 3, baseDelayMs: 200 },
  });
  const noStore = { cache: 'no-store' } as const;

  /** Backend error → domain error (by `code`/status); anything unexpected is logged with its request id. */
  function toDomainError(error: unknown): unknown {
    if (!isApiError(error)) return error;
    switch (error.status) {
      case 400:
        if (error.code === 'VALIDATION_FAILED')
          return new ValidationError(error.details as FieldErrors, error.message);
        break;
      case 401:
        return new UnauthorizedError(
          error.message,
          UNAUTHORIZED_CODES.has(error.code)
            ? (error.code as UnauthorizedError['code'])
            : undefined,
        );
      case 403:
        return new ForbiddenError(error.message);
      case 404:
        return new NotFoundError(error.message, error.code as NotFoundError['code']);
      case 409:
        return new ConflictError(error.message, error.code as ConflictError['code']);
      case 429:
        // LOGIN_LOCKED (email + IP lockout) or TOO_MANY_REQUESTS (per-IP throttle): both mean "wait".
        return new TooManyAttemptsError(
          error.retryAfterSeconds ?? 60,
          error.message,
          error.code === 'LOGIN_LOCKED' ? 'LOGIN_LOCKED' : 'TOO_MANY_REQUESTS',
        );
    }
    logger.error('backend request failed', {
      status: error.status,
      code: error.code,
      requestId: error.requestId,
      error,
    });
    return error;
  }

  async function call<T>(request: Promise<T>): Promise<T> {
    try {
      return await request;
    } catch (error) {
      throw toDomainError(error);
    }
  }

  /** `null` instead of a 401 (bad credentials / no session); other failures still map and throw. */
  async function nullOn401<T>(request: Promise<T>): Promise<T | null> {
    try {
      return await request;
    } catch (error) {
      if (isApiError(error) && error.status === 401) return null;
      throw toDomainError(error);
    }
  }

  /** Tokens from a login/refresh response's Set-Cookie headers (values and Max-Age from the backend). */
  function tokensFrom(response: Response): SessionTokens | undefined {
    const cookies = parseSetCookies(response.headers.getSetCookie());
    const access = cookies.get(SESSION_COOKIE);
    const refresh = cookies.get(REFRESH_COOKIE);
    return access && refresh
      ? {
          accessToken: access.value,
          accessTokenMaxAge: access.maxAge,
          refreshToken: refresh.value,
          refreshTokenMaxAge: refresh.maxAge,
        }
      : undefined;
  }

  /**
   * A client that captures the session cookies of one response. One per call: tokens live in this
   * closure only (concurrent sign-ins must never see each other's tokens). `forwarded` carries the
   * end user's IP / user agent when there is no request scope (proxy.ts).
   */
  function sessionClient(forwarded?: ForwardedClient) {
    let tokens: SessionTokens | undefined;
    const http = createHttpClient({
      baseUrl,
      interceptors: [
        ...(forwarded
          ? [requestIdInterceptor(), headersInterceptor(() => forwardedHeaders(forwarded))]
          : common),
        {
          response(response) {
            tokens = tokensFrom(response);
          },
        },
      ],
    });
    return { http, tokens: () => tokens };
  }

  return {
    auth: {
      async login(email, password) {
        const { http, tokens } = sessionClient();
        const result = await nullOn401(
          http.post<{ user: AdminUser }>('/api/auth/login', { email, password }),
        );
        if (!result) return null;
        const session = tokens();
        if (!session) throw new ApiError(502, 'Login succeeded without session cookies');
        return { user: result.user, tokens: session };
      },
      async refresh(refreshToken, forwarded) {
        const { http, tokens } = sessionClient(forwarded);
        const { user } = await call(
          http.post<{ user: AdminUser }>('/api/auth/refresh', { refreshToken }),
        );
        const session = tokens();
        if (!session) throw new ApiError(502, 'Refresh succeeded without session cookies');
        return { user, tokens: session };
      },
      async logout({ refreshToken, accessToken }) {
        // Bearer as a fallback for sessions without a refresh cookie; 204 either way.
        await call(
          client.post('/api/auth/logout', refreshToken ? { refreshToken } : {}, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          }),
        );
      },
      // The backend checks the session (sid) on every call; the claims were verified by the caller.
      currentUser: async () =>
        (await nullOn401(client.get<{ user: AdminUser }>('/api/auth/me', noStore)))?.user ?? null,
    },
    metrics: {
      list: (range) =>
        call(
          client.get<DailyMetric[]>('/api/admin/daily-metrics', {
            ...noStore,
            query: { ...range },
          }),
        ),
      create: (input) => call(client.post<DailyMetric>('/api/admin/daily-metrics', input)),
      update: (id, input) => call(client.put<DailyMetric>(`/api/admin/daily-metrics/${id}`, input)),
      remove: (id) => call(client.delete(`/api/admin/daily-metrics/${id}`)),
      upsertWeek: async (weekStart, days) =>
        (await call(client.put<{ days: DailyMetric[] }>(`/api/admin/weeks/${weekStart}`, { days })))
          .days,
    },
    events: {
      list: (range) =>
        call(client.get<EventImpact[]>('/api/admin/events', { ...noStore, query: { ...range } })),
      create: (input) => call(client.post<EventImpact>('/api/admin/events', input)),
      update: (id, input) => call(client.put<EventImpact>(`/api/admin/events/${id}`, input)),
      remove: (id) => call(client.delete(`/api/admin/events/${id}`)),
    },
  };
}

const UNAUTHORIZED_CODES = new Set<string>([
  'UNAUTHORIZED',
  'INVALID_CREDENTIALS',
  'ACCESS_TOKEN_EXPIRED',
  'INVALID_REFRESH_TOKEN',
  'REFRESH_TOKEN_REUSED',
]);

/** The end user's IP chain and user agent, for the backend's rate limits and session audit. */
function forwardedHeaders({ forwardedFor, userAgent }: ForwardedClient = {}): HeadersInit {
  return {
    ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
    ...(userAgent ? { 'User-Agent': userAgent } : {}),
  };
}
