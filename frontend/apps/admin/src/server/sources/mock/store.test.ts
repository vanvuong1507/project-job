import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import seed from './fixtures/seed.json';
import { ConflictError, NotFoundError } from '../../errors';
import { createStore, type Database, type Store } from './store';

const day = { posRevenue: 100, eatclubRevenue: 50, labourCost: 40, covers: 10 };

describe('mock store', () => {
  let dir: string;
  let file: string;
  let store: Store;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'admin-store-'));
    file = join(dir, 'db.json');
    store = createStore({
      file,
      seed: () => ({ users: [], ...(structuredClone(seed) as Omit<Database, 'users'>) }),
      now: () => new Date('2026-10-16T12:00:00Z'),
    });
  });

  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('seeds on first read and filters by date range', async () => {
    const week = await store.dailyMetrics.list({ from: '2026-10-12', to: '2026-10-18' });
    expect(week).toHaveLength(7);
    expect(week.reduce((sum, m) => sum + m.posRevenue + m.eatclubRevenue, 0)).toBe(15974);
    expect(JSON.parse(await readFile(file, 'utf8')).dailyMetrics).toHaveLength(14);
  });

  it('upserts a whole week: updates existing days, creates missing ones', async () => {
    const days = Array.from({ length: 7 }, (_, i) => ({ ...day, covers: i }));

    const updated = await store.dailyMetrics.upsertWeek('2026-10-12', days);
    expect(updated.map((m) => m.covers)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(updated[0]?.updatedAt).toBe('2026-10-16T12:00:00.000Z');

    await store.dailyMetrics.upsertWeek('2026-10-19', days);
    expect(await store.dailyMetrics.list({ from: '2026-10-19' })).toHaveLength(7);
  });

  it('rejects a duplicate date and unknown ids', async () => {
    await expect(store.dailyMetrics.create({ ...day, date: '2026-10-12' })).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(store.dailyMetrics.remove('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('creates, updates and deletes events', async () => {
    const created = await store.events.create({
      date: '2026-10-14',
      impact: 'NEGATIVE',
      title: 'Power cut',
      description: null,
    });
    await store.events.update(created.id, { ...created, title: 'Power outage' });
    expect((await store.events.list({ from: '2026-10-14', to: '2026-10-14' }))[0]?.title).toBe(
      'Power outage',
    );

    await store.events.remove(created.id);
    expect(await store.events.list({ from: '2026-10-14', to: '2026-10-14' })).toEqual([]);
  });

  it('serialises concurrent writes without losing any', async () => {
    await Promise.all(
      ['A', 'B', 'C', 'D'].map((title) =>
        store.events.create({ date: '2026-10-20', impact: 'POSITIVE', title, description: null }),
      ),
    );
    expect(await store.events.list({ from: '2026-10-20' })).toHaveLength(4);
  });

  it('seeds once and keeps every write when separate store instances race on a fresh file', async () => {
    // Route bundles may each get their own module instance; they must still share one queue per file.
    const seedFn = () => ({ users: [], ...(structuredClone(seed) as Omit<Database, 'users'>) });
    const stores = [createStore({ file, seed: seedFn }), createStore({ file, seed: seedFn })];

    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        stores[i % 2]!.events.create({
          date: '2026-10-21',
          impact: 'POSITIVE',
          title: `E${i}`,
          description: null,
        }),
      ),
    );

    expect(await stores[0]!.events.list({ from: '2026-10-21' })).toHaveLength(10);
    expect(await stores[1]!.dailyMetrics.list()).toHaveLength(14);
  });
});

describe('mock store: sessions (same rules as the backend)', () => {
  const policy = { refreshTtlMs: 60_000, sessionMaxMs: 300_000, reuseLeewayMs: 5_000 };
  let dir: string;
  let clock: number;
  let store: Store;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'admin-sessions-'));
    clock = Date.parse('2026-10-16T12:00:00Z');
    store = createStore({
      file: join(dir, 'db.json'),
      seed: () => ({ users: [], ...(structuredClone(seed) as Omit<Database, 'users'>) }),
      now: () => new Date(clock),
    });
  });

  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('rotates, honours the previous generation within the leeway, then treats it as reuse', async () => {
    const session = await store.sessions.create('user-1', policy);
    expect(await store.sessions.rotate(session.id, 0, policy)).toMatchObject({
      status: 'ok',
      session: { generation: 1 },
    });

    clock += 1_000; // a parallel request with the old token: same successor, no rotation
    expect(await store.sessions.rotate(session.id, 0, policy)).toMatchObject({
      status: 'ok',
      session: { generation: 1 },
    });

    clock += 10_000; // outside the leeway: theft → revoke
    expect(await store.sessions.rotate(session.id, 0, policy)).toEqual({ status: 'reused' });
    expect(await store.sessions.rotate(session.id, 1, policy)).toEqual({ status: 'invalid' });
    expect(await store.sessions.isActive(session.id, 'user-1')).toBe(false);
  });

  it('slides the expiry on refresh but never past the absolute limit', async () => {
    const session = await store.sessions.create('user-1', policy);
    let generation = 0;
    for (let minute = 0; minute < 4; minute++) {
      clock += 50_000; // refresh before each 60s window ends
      const result = await store.sessions.rotate(session.id, generation, policy);
      expect(result.status).toBe('ok');
      generation += 1;
    }
    clock += 110_000; // past the 300s absolute limit
    expect(await store.sessions.rotate(session.id, generation, policy)).toEqual({
      status: 'invalid',
    });
  });

  it('expires an idle session and revokes on logout', async () => {
    const idle = await store.sessions.create('user-1', policy);
    clock += 61_000;
    expect(await store.sessions.rotate(idle.id, 0, policy)).toEqual({ status: 'invalid' });

    const active = await store.sessions.create('user-1', policy);
    expect(await store.sessions.isActive(active.id, 'user-1')).toBe(true);
    expect(await store.sessions.isActive(active.id, 'someone-else')).toBe(false);
    await store.sessions.revoke(active.id);
    expect(await store.sessions.isActive(active.id, 'user-1')).toBe(false);
  });
});
