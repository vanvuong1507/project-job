import 'server-only';
import type { AdminUser, DailyMetric, EventImpact } from '@frontend/api-client';
import { randomUUID } from 'node:crypto';
import { link, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { DailyMetricInput, DayMetricsInput } from '@/features/metrics/schemas';
import type { EventData } from '@/features/events/schemas';
import { weekDays } from '@/lib/week';
import { ConflictError, NotFoundError } from '../../errors';

/**
 * File-backed mock database (docs/US-TASK-DETAIL.md §1.1).
 * Read on every call, so deleting the file (`pnpm mock:reset`) resets it even while the server runs.
 * Writes are atomic (unique temp file + rename) and serialised per file across the whole process —
 * bundlers can instantiate this module once per route, so the queue lives on `globalThis`.
 */

const queues: Map<string, Promise<unknown>> = ((
  globalThis as { __mockStoreQueues?: Map<string, Promise<unknown>> }
).__mockStoreQueues ??= new Map());

const isErrno = (error: unknown, code: string) =>
  (error as NodeJS.ErrnoException | null)?.code === code;

interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord extends AdminUser, Timestamps {
  /** Hash only — the plain password is never stored. */
  passwordHash: string;
}
export type DailyMetricRecord = DailyMetric & Timestamps;
export type EventRecord = EventImpact & Timestamps & { description: string | null };

/** A refresh-token session (same rules as the backend's `auth_sessions`). Dates are ISO strings. */
export interface SessionRecord {
  id: string;
  userId: string;
  generation: number;
  rotatedAt: string | null;
  expiresAt: string;
  absoluteExpiresAt: string;
  revokedAt: string | null;
  revokedReason: 'logout' | 'reuse' | 'expired' | null;
  createdAt: string;
}

/** Session lifetimes in milliseconds. */
export interface SessionPolicy {
  refreshTtlMs: number;
  sessionMaxMs: number;
  reuseLeewayMs: number;
}

export type RotateResult =
  { status: 'ok'; session: SessionRecord } | { status: 'invalid' } | { status: 'reused' };

export interface Database {
  users: UserRecord[];
  /** Absent in files created before sessions existed. */
  sessions?: SessionRecord[];
  dailyMetrics: DailyMetricRecord[];
  events: EventRecord[];
}

export interface DateRange {
  from?: string;
  to?: string;
}

export interface StoreOptions {
  file: string;
  seed: () => Database | Promise<Database>;
  now?: () => Date;
}

const slidingExpiry = (nowMs: number, absoluteExpiresAt: string, policy: SessionPolicy) =>
  new Date(Math.min(nowMs + policy.refreshTtlMs, Date.parse(absoluteExpiresAt))).toISOString();

const inRange = (date: string, { from, to }: DateRange) =>
  (!from || date >= from) && (!to || date <= to);
const byDate = <T extends { date: string }>(a: T, b: T) => a.date.localeCompare(b.date);

export function createStore({ file, seed, now = () => new Date() }: StoreOptions) {
  async function writeTemp(db: Database): Promise<string> {
    await mkdir(dirname(file), { recursive: true });
    const temp = `${file}.${randomUUID()}.tmp`;
    await writeFile(temp, `${JSON.stringify(db, null, 2)}\n`);
    return temp;
  }

  async function save(db: Database) {
    await rename(await writeTemp(db), file);
  }

  /** Creates the file from the seed exactly once, even when several requests race to do it. */
  async function createFromSeed(): Promise<Database> {
    const temp = await writeTemp(await seed());
    try {
      await link(temp, file); // atomic, fails with EEXIST if another request won the race
    } catch (error) {
      if (!isErrno(error, 'EEXIST')) throw error;
    } finally {
      await unlink(temp);
    }
    return load();
  }

  async function load(): Promise<Database> {
    try {
      return JSON.parse(await readFile(file, 'utf8')) as Database;
    } catch (error) {
      if (!isErrno(error, 'ENOENT')) throw error;
      return createFromSeed();
    }
  }

  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = (queues.get(file) ?? Promise.resolve()).then(task);
    queues.set(
      file,
      run.catch(() => undefined),
    );
    return run;
  }

  /** Runs a read-modify-write step exclusively, then persists. */
  const mutate = <T>(change: (db: Database, timestamp: string) => T): Promise<T> =>
    enqueue(async () => {
      const db = await load();
      const result = change(db, now().toISOString());
      await save(db);
      return result;
    });

  const read = <T>(select: (db: Database) => T) => enqueue(load).then(select);

  return {
    /**
     * Refresh-token sessions: rotation, a reuse leeway for parallel requests, reuse detection
     * (an older generation revokes the session), sliding + absolute expiry. Mirrors the backend's
     * SessionsService; the store's write queue serialises concurrent refreshes.
     */
    sessions: {
      create: (userId: string, policy: SessionPolicy) =>
        mutate((db, timestamp) => {
          const nowMs = Date.parse(timestamp);
          const alive = (record: SessionRecord) =>
            !record.revokedAt && Date.parse(record.expiresAt) > nowMs;
          db.sessions = (db.sessions ?? []).filter((record) => alive(record));
          const absoluteExpiresAt = new Date(nowMs + policy.sessionMaxMs).toISOString();
          const session: SessionRecord = {
            id: randomUUID(),
            userId,
            generation: 0,
            rotatedAt: null,
            expiresAt: slidingExpiry(nowMs, absoluteExpiresAt, policy),
            absoluteExpiresAt,
            revokedAt: null,
            revokedReason: null,
            createdAt: timestamp,
          };
          db.sessions.push(session);
          return session;
        }),

      rotate: (sessionId: string, generation: number, policy: SessionPolicy) =>
        mutate((db, timestamp): RotateResult => {
          const nowMs = Date.parse(timestamp);
          const session = db.sessions?.find((record) => record.id === sessionId);
          if (!session || session.revokedAt) return { status: 'invalid' };
          if (
            nowMs >= Date.parse(session.expiresAt) ||
            nowMs >= Date.parse(session.absoluteExpiresAt)
          ) {
            Object.assign(session, { revokedAt: timestamp, revokedReason: 'expired' });
            return { status: 'invalid' };
          }
          if (generation === session.generation) {
            session.generation += 1;
            session.rotatedAt = timestamp;
            session.expiresAt = slidingExpiry(nowMs, session.absoluteExpiresAt, policy);
            return { status: 'ok', session: { ...session } };
          }
          const justRotated =
            generation === session.generation - 1 &&
            session.rotatedAt !== null &&
            nowMs - Date.parse(session.rotatedAt) <= policy.reuseLeewayMs;
          if (justRotated) return { status: 'ok', session: { ...session } };
          Object.assign(session, { revokedAt: timestamp, revokedReason: 'reuse' });
          return { status: 'reused' };
        }),

      revoke: (sessionId: string) =>
        mutate((db, timestamp) => {
          const session = db.sessions?.find((record) => record.id === sessionId);
          if (session && !session.revokedAt)
            Object.assign(session, { revokedAt: timestamp, revokedReason: 'logout' });
        }),

      isActive: (sessionId: string, userId: string) =>
        read((db) => {
          const nowMs = now().getTime();
          return Boolean(
            db.sessions?.some(
              (record) =>
                record.id === sessionId &&
                record.userId === userId &&
                !record.revokedAt &&
                Date.parse(record.expiresAt) > nowMs &&
                Date.parse(record.absoluteExpiresAt) > nowMs,
            ),
          );
        }),
    },

    users: {
      findByEmail: (email: string) =>
        read((db) => db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null),
      findById: (id: string) => read((db) => db.users.find((u) => u.id === id) ?? null),
    },

    dailyMetrics: {
      list: (range: DateRange = {}) =>
        read((db) => db.dailyMetrics.filter((m) => inRange(m.date, range)).sort(byDate)),

      create: (input: DailyMetricInput) =>
        mutate((db, timestamp) => {
          if (db.dailyMetrics.some((m) => m.date === input.date)) {
            throw new ConflictError(
              `Metrics for ${input.date} already exist`,
              'DAILY_METRIC_DATE_TAKEN',
            );
          }
          const record = { id: randomUUID(), ...input, createdAt: timestamp, updatedAt: timestamp };
          db.dailyMetrics.push(record);
          return record;
        }),

      update: (id: string, input: DailyMetricInput) =>
        mutate((db, timestamp) => {
          const record = db.dailyMetrics.find((m) => m.id === id);
          if (!record) throw new NotFoundError('Daily metric not found', 'DAILY_METRIC_NOT_FOUND');
          if (db.dailyMetrics.some((m) => m.id !== id && m.date === input.date)) {
            throw new ConflictError(
              `Metrics for ${input.date} already exist`,
              'DAILY_METRIC_DATE_TAKEN',
            );
          }
          return Object.assign(record, input, { updatedAt: timestamp });
        }),

      remove: (id: string) =>
        mutate((db) => {
          const index = db.dailyMetrics.findIndex((m) => m.id === id);
          if (index === -1)
            throw new NotFoundError('Daily metric not found', 'DAILY_METRIC_NOT_FOUND');
          db.dailyMetrics.splice(index, 1);
        }),

      /** Creates or updates all 7 days of the week starting at `weekStart` (Monday). */
      upsertWeek: (weekStart: string, days: readonly DayMetricsInput[]) =>
        mutate((db, timestamp) =>
          weekDays(weekStart).map((date, i) => {
            const values = days[i]!;
            const existing = db.dailyMetrics.find((m) => m.date === date);
            if (existing) return Object.assign(existing, values, { updatedAt: timestamp });
            const record = {
              id: randomUUID(),
              date,
              ...values,
              createdAt: timestamp,
              updatedAt: timestamp,
            };
            db.dailyMetrics.push(record);
            return record;
          }),
        ),
    },

    events: {
      list: (range: DateRange = {}) =>
        read((db) => db.events.filter((e) => inRange(e.date, range)).sort(byDate)),

      create: (input: EventData) =>
        mutate((db, timestamp) => {
          const record = { id: randomUUID(), ...input, createdAt: timestamp, updatedAt: timestamp };
          db.events.push(record);
          return record;
        }),

      update: (id: string, input: EventData) =>
        mutate((db, timestamp) => {
          const record = db.events.find((e) => e.id === id);
          if (!record) throw new NotFoundError('Event not found', 'EVENT_NOT_FOUND');
          return Object.assign(record, input, { updatedAt: timestamp });
        }),

      remove: (id: string) =>
        mutate((db) => {
          const index = db.events.findIndex((e) => e.id === id);
          if (index === -1) throw new NotFoundError('Event not found', 'EVENT_NOT_FOUND');
          db.events.splice(index, 1);
        }),
    },
  };
}

export type Store = ReturnType<typeof createStore>;
