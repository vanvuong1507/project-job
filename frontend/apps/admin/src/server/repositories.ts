import 'server-only';
import type { AdminUser, DailyMetric, EventImpact } from '@frontend/api-client';
import type { SessionClaims } from './auth/tokens';
import type { SessionTokens } from './auth/session-cookies';
import type { EventData } from '@/features/events/schemas';
import type { DailyMetricInput, DayMetricsInput } from '@/features/metrics/schemas';

/**
 * Data-source contracts used by the DAL. Two implementations: `sources/mock` (file-backed, no backend)
 * and `sources/api` (the real backend over HTTP). Selected by `DATA_SOURCE` in `./data-source.ts`.
 * They return DTOs — never password hashes or storage records.
 */

export interface DateRange {
  from?: string;
  to?: string;
}

/** The end user behind a call made outside a request scope (proxy.ts passes it explicitly). */
export interface ForwardedClient {
  forwardedFor?: string;
  userAgent?: string;
}

/** A signed-in user and the tokens of the session (access + refresh). */
export interface AuthSession {
  user: AdminUser;
  tokens: SessionTokens;
}

export interface AuthRepository {
  /** Checks credentials and starts a session, or `null` for invalid credentials. */
  login(email: string, password: string): Promise<AuthSession | null>;
  /**
   * Exchanges a refresh token for a new pair (rotation). Throws `UnauthorizedError` when the token is
   * invalid, expired or replayed (`REFRESH_TOKEN_REUSED`, the session is then revoked).
   */
  refresh(refreshToken: string, forwarded?: ForwardedClient): Promise<AuthSession>;
  /** Revokes the session (idempotent): its access and refresh tokens stop working. */
  logout(tokens: { refreshToken?: string; accessToken?: string }): Promise<void>;
  /** The user of a verified access token whose session is still active, or `null`. */
  currentUser(claims: SessionClaims): Promise<AdminUser | null>;
}

export interface MetricsRepository {
  list(range: DateRange): Promise<DailyMetric[]>;
  create(input: DailyMetricInput): Promise<DailyMetric>;
  update(id: string, input: DailyMetricInput): Promise<DailyMetric>;
  remove(id: string): Promise<void>;
  /** Creates or updates all 7 days of the week starting at `weekStart` (Monday). */
  upsertWeek(weekStart: string, days: readonly DayMetricsInput[]): Promise<DailyMetric[]>;
}

export interface EventsRepository {
  list(range: DateRange): Promise<EventImpact[]>;
  create(input: EventData): Promise<EventImpact>;
  update(id: string, input: EventData): Promise<EventImpact>;
  remove(id: string): Promise<void>;
}

export interface Repositories {
  auth: AuthRepository;
  metrics: MetricsRepository;
  events: EventsRepository;
}
