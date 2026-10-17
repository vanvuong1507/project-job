import 'server-only';
import type { AdminUser, DailyMetric, EventImpact, Role } from '@frontend/api-client';
import { join } from 'node:path';
import { env } from '@/env';
import type { AuthSession, Repositories } from '../../repositories';
import { UnauthorizedError } from '../../errors';
import { decodeRefreshToken, deriveRefreshKey, encodeRefreshToken } from '../../auth/refresh-token';
import {
  hashPassword,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from '../../auth/tokens';
import seed from './fixtures/seed.json';
import {
  createStore,
  type Database,
  type DailyMetricRecord,
  type EventRecord,
  type SessionPolicy,
  type SessionRecord,
  type UserRecord,
} from './store';

/** The mock database: `.mock-data/db.json` in the app, created from the seed (+ env users) on first use. */
export const MOCK_DATA_FILE = join(process.cwd(), '.mock-data', 'db.json');

async function createSeed(): Promise<Database> {
  const timestamp = new Date().toISOString();
  const account = async (
    id: string,
    role: Role,
    email: string,
    name: string,
    password: string,
  ) => ({
    id,
    role,
    email,
    name,
    passwordHash: await hashPassword(password),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return {
    users: [
      await account('admin-1', 'ADMIN', env.ADMIN_EMAIL, env.ADMIN_NAME, env.ADMIN_PASSWORD),
      await account('viewer-1', 'VIEWER', env.VIEWER_EMAIL, env.VIEWER_NAME, env.VIEWER_PASSWORD),
    ],
    ...(structuredClone(seed) as Omit<Database, 'users'>),
  };
}

// Records written before roles existed get the least privilege (run `pnpm mock:reset` to reseed).
const toUser = ({ id, email, name, role }: UserRecord): AdminUser => ({
  id,
  email,
  name,
  role: role ?? 'VIEWER',
});
const toMetric = ({ createdAt: _c, updatedAt: _u, ...metric }: DailyMetricRecord): DailyMetric =>
  metric;
const toEvent = ({ createdAt: _c, updatedAt: _u, ...event }: EventRecord): EventImpact => event;

/** Same defaults as the backend (ACCESS_TOKEN_TTL_MINUTES, REFRESH_TOKEN_TTL_DAYS, …). */
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const POLICY: SessionPolicy = {
  refreshTtlMs: 7 * 86_400_000,
  sessionMaxMs: 30 * 86_400_000,
  reuseLeewayMs: 30_000,
};

/** Repositories over the file-backed mock store (no backend needed). */
export function createMockRepositories(): Repositories {
  const store = createStore({ file: MOCK_DATA_FILE, seed: createSeed });
  const refreshKey = deriveRefreshKey(env.AUTH_SECRET);

  /** Access token (JWT with `sid`) + refresh token for the current generation of a session. */
  async function issue(user: AdminUser, session: SessionRecord): Promise<AuthSession> {
    return {
      user,
      tokens: {
        accessToken: await signSessionToken(
          { userId: user.id, role: user.role, sessionId: session.id },
          env.AUTH_SECRET,
          ACCESS_TOKEN_TTL_SECONDS,
        ),
        accessTokenMaxAge: ACCESS_TOKEN_TTL_SECONDS,
        refreshToken: encodeRefreshToken(refreshKey, {
          sessionId: session.id,
          generation: session.generation,
        }),
        refreshTokenMaxAge: Math.ceil((Date.parse(session.expiresAt) - Date.now()) / 1000),
      },
    };
  }

  return {
    auth: {
      async login(email, password) {
        const user = await store.users.findByEmail(email);
        if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
        return issue(toUser(user), await store.sessions.create(user.id, POLICY));
      },
      async refresh(refreshToken) {
        const claims = decodeRefreshToken(refreshKey, refreshToken);
        const result = claims
          ? await store.sessions.rotate(claims.sessionId, claims.generation, POLICY)
          : ({ status: 'invalid' } as const);
        if (result.status === 'reused') {
          throw new UnauthorizedError(
            'This session was revoked because an old refresh token was reused. Sign in again.',
            'REFRESH_TOKEN_REUSED',
          );
        }
        const user =
          result.status === 'ok' ? await store.users.findById(result.session.userId) : null;
        if (result.status !== 'ok' || !user) {
          throw new UnauthorizedError(
            'The refresh token is invalid or expired. Sign in again.',
            'INVALID_REFRESH_TOKEN',
          );
        }
        return issue(toUser(user), result.session);
      },
      async logout({ refreshToken, accessToken }) {
        const sessionId =
          decodeRefreshToken(refreshKey, refreshToken)?.sessionId ??
          (await verifySessionToken(accessToken, env.AUTH_SECRET))?.sessionId;
        if (sessionId) await store.sessions.revoke(sessionId);
      },
      async currentUser({ userId, sessionId }) {
        if (!(await store.sessions.isActive(sessionId, userId))) return null;
        const user = await store.users.findById(userId);
        return user && toUser(user);
      },
    },
    metrics: {
      list: async (range) => (await store.dailyMetrics.list(range)).map(toMetric),
      create: async (input) => toMetric(await store.dailyMetrics.create(input)),
      update: async (id, input) => toMetric(await store.dailyMetrics.update(id, input)),
      remove: (id) => store.dailyMetrics.remove(id),
      upsertWeek: async (weekStart, days) =>
        (await store.dailyMetrics.upsertWeek(weekStart, days)).map(toMetric),
    },
    events: {
      list: async (range) => (await store.events.list(range)).map(toEvent),
      create: async (input) => toEvent(await store.events.create(input)),
      update: async (id, input) => toEvent(await store.events.update(id, input)),
      remove: (id) => store.events.remove(id),
    },
  };
}
