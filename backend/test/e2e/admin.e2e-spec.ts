import { z } from 'zod';
import { eventImpactSchema } from '../../src/modules/events/dto/event.dto.js';
import {
  dailyMetricSchema,
  weekUpsertResponseSchema,
} from '../../src/modules/metrics/dto/metrics.dto.js';
import { errorBody, expectError } from '../utils/assertions.js';
import { createTestApp, type TestApp } from '../utils/test-app.js';

const DAY = { posRevenue: 1000, eatclubRevenue: 250.5, labourCost: 400, covers: 60 };

describe('admin API', () => {
  let t: TestApp;
  let cookie: string;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(async () => {
    await t.reset();
    cookie = await t.login();
  });
  afterAll(() => t.close());

  const as = () => ({
    get: (url: string) => t.http().get(url).set('Cookie', cookie),
    post: (url: string, body: object) => t.http().post(url).set('Cookie', cookie).send(body),
    put: (url: string, body: object) => t.http().put(url).set('Cookie', cookie).send(body),
    delete: (url: string) => t.http().delete(url).set('Cookie', cookie),
  });

  it.each([
    ['get', '/api/admin/daily-metrics'],
    ['post', '/api/admin/daily-metrics'],
    ['put', '/api/admin/daily-metrics/00000000-0000-4000-8000-000000000000'],
    ['delete', '/api/admin/daily-metrics/00000000-0000-4000-8000-000000000000'],
    ['put', '/api/admin/weeks/2026-10-12'],
    ['get', '/api/admin/events'],
    ['post', '/api/admin/events'],
    ['put', '/api/admin/events/00000000-0000-4000-8000-000000000000'],
    ['delete', '/api/admin/events/00000000-0000-4000-8000-000000000000'],
  ] as const)('%s %s requires a session', async (method, url) => {
    const http = t.http();
    await http[method](url).expect(expectError(401, 'UNAUTHORIZED', 'Unauthorized'));
  });

  describe('roles', () => {
    it('lets a VIEWER read but not write (403)', async () => {
      const viewer = await t.login('VIEWER');
      const asViewer = (req: ReturnType<ReturnType<TestApp['http']>['get']>) =>
        req.set('Cookie', viewer);
      const anyId = '00000000-0000-4000-8000-000000000000';

      await asViewer(t.http().get('/api/admin/daily-metrics')).expect(200);
      await asViewer(t.http().get('/api/admin/events')).expect(200);

      const forbidden = expectError(403, 'FORBIDDEN', 'Forbidden');
      await asViewer(t.http().post('/api/admin/daily-metrics'))
        .send({ date: '2026-10-19', ...DAY })
        .expect(forbidden);
      await asViewer(t.http().put(`/api/admin/daily-metrics/${anyId}`))
        .send({ date: '2026-10-19', ...DAY })
        .expect(forbidden);
      await asViewer(t.http().delete(`/api/admin/daily-metrics/${anyId}`)).expect(forbidden);
      await asViewer(t.http().put('/api/admin/weeks/2026-10-12'))
        .send({ days: Array.from({ length: 7 }, () => DAY) })
        .expect(forbidden);
      await asViewer(t.http().post('/api/admin/events'))
        .send({ date: '2026-10-13', impact: 'POSITIVE', title: 'x' })
        .expect(forbidden);
      await asViewer(t.http().put(`/api/admin/events/${anyId}`))
        .send({ date: '2026-10-13', impact: 'POSITIVE', title: 'x' })
        .expect(forbidden);
      await asViewer(t.http().delete(`/api/admin/events/${anyId}`)).expect(forbidden);

      // nothing changed
      const trend = await t.http().get('/api/dashboard/revenue-trend');
      expect(trend.body.summary.totalRevenue.current).toBe(15974);
    });

    it('applies the role from the database, not from the token', async () => {
      const admin = await t.login('ADMIN');
      await t.app
        .get((await import('typeorm')).DataSource)
        .query(`UPDATE admin_users SET role = 'VIEWER' WHERE email = 'admin@example.com'`);
      await t
        .http()
        .delete('/api/admin/events/00000000-0000-4000-8000-000000000000')
        .set('Cookie', admin)
        .expect(403);
    });
  });

  describe('daily metrics', () => {
    it('lists by date range, sorted', async () => {
      const { body } = await as()
        .get('/api/admin/daily-metrics?from=2026-10-12&to=2026-10-14')
        .expect(200);
      expect(body.map((m: { date: string }) => m.date)).toEqual([
        '2026-10-12',
        '2026-10-13',
        '2026-10-14',
      ]);
      z.array(dailyMetricSchema.strict()).parse(body); // documented contract
      expect(body[0]).toEqual({
        id: expect.any(String),
        date: '2026-10-12',
        posRevenue: 1720,
        eatclubRevenue: 310,
        labourCost: 600,
        covers: 118,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('creates, updates and deletes a day', async () => {
      const created = await as()
        .post('/api/admin/daily-metrics', { date: '2026-10-19', ...DAY })
        .expect(201);
      expect(created.headers.location).toBe(`/api/admin/daily-metrics/${created.body.id}`);
      expect(created.body).toMatchObject({ date: '2026-10-19', ...DAY });

      const updated = await as()
        .put(`/api/admin/daily-metrics/${created.body.id}`, {
          date: '2026-10-19',
          ...DAY,
          covers: 61,
        })
        .expect(200);
      expect(updated.body.covers).toBe(61);

      await as().delete(`/api/admin/daily-metrics/${created.body.id}`).expect(204);
      await as()
        .delete(`/api/admin/daily-metrics/${created.body.id}`)
        .expect(expectError(404, 'DAILY_METRIC_NOT_FOUND', 'Daily metric not found'));
    });

    it('answers 409 for a date that already has metrics', async () => {
      await as()
        .post('/api/admin/daily-metrics', { date: '2026-10-12', ...DAY })
        .expect(
          expectError(409, 'DAILY_METRIC_DATE_TAKEN', 'Metrics for 2026-10-12 already exist'),
        );
    });

    it('returns field errors with dotted paths', async () => {
      const { body } = await as()
        .post('/api/admin/daily-metrics', {
          date: '2026-02-30',
          posRevenue: -1,
          eatclubRevenue: 1.234,
          labourCost: '5',
          covers: 1.5,
        })
        .expect(400);
      expect(body).toEqual(
        errorBody(400, 'VALIDATION_FAILED', 'Validation failed', {
          date: ['Use a valid date (YYYY-MM-DD)'],
          posRevenue: ['Must be 0 or more'],
          eatclubRevenue: ['Use at most 2 decimals'],
          labourCost: ['Enter a number'],
          covers: ['Must be a whole number'],
        }),
      );
    });

    it('rejects a non-uuid id', async () => {
      await as()
        .delete('/api/admin/daily-metrics/42')
        .expect(expectError(400, 'VALIDATION_FAILED', 'Validation failed', { id: ['Invalid id'] }));
    });
  });

  describe('PUT /api/admin/weeks/:weekStart', () => {
    it('upserts the 7 days and the dashboard reflects them', async () => {
      const days = Array.from({ length: 7 }, (_, i) => ({ ...DAY, covers: 100 + i }));
      const { body } = await as().put('/api/admin/weeks/2026-10-12', { days }).expect(200);
      weekUpsertResponseSchema.parse(body);
      expect(body.weekStart).toBe('2026-10-12');
      expect(body.days.map((d: { date: string; covers: number }) => [d.date, d.covers])).toEqual([
        ['2026-10-12', 100],
        ['2026-10-13', 101],
        ['2026-10-14', 102],
        ['2026-10-15', 103],
        ['2026-10-16', 104],
        ['2026-10-17', 105],
        ['2026-10-18', 106],
      ]);

      const trend = await t.http().get('/api/dashboard/revenue-trend?weekStart=2026-10-12');
      expect(trend.body.summary.totalCovers.current).toBe(721);
      expect(trend.body.summary.totalRevenue.current).toBe(8753.5);
    });

    it('creates rows for a new week', async () => {
      const days = Array.from({ length: 7 }, () => DAY);
      await as().put('/api/admin/weeks/2026-10-19', { days }).expect(200);
      const { body } = await t.http().get('/api/dashboard/revenue-trend').expect(200);
      expect(body.week.start).toBe('2026-10-19');
      expect(body.summary.totalRevenue.previous).toBe(15974);
    });

    it('validates the week start and the 7 days', async () => {
      await as()
        .put('/api/admin/weeks/2026-10-13', { days: Array.from({ length: 7 }, () => DAY) })
        .expect(
          expectError(400, 'VALIDATION_FAILED', 'Validation failed', {
            weekStart: ['The week must start on a Monday'],
          }),
        );
      const { body } = await as()
        .put('/api/admin/weeks/2026-10-12', { days: [{ ...DAY, covers: -1 }] })
        .expect(400);
      expect(body.details).toEqual({
        'days.0.covers': ['Must be 0 or more'],
        days: ['Provide exactly 7 days'],
      });
    });
  });

  describe('events', () => {
    it('creates (trimming text, empty description → null), lists, updates and deletes', async () => {
      const created = await as()
        .post('/api/admin/events', {
          date: '2026-10-13',
          impact: 'POSITIVE',
          title: '  Promo night  ',
          description: '',
        })
        .expect(201);
      eventImpactSchema.strict().parse(created.body);
      expect(created.body).toMatchObject({
        date: '2026-10-13',
        impact: 'POSITIVE',
        title: 'Promo night',
        description: null,
      });

      const trend = await t.http().get('/api/dashboard/revenue-trend?weekStart=2026-10-12');
      expect(trend.body.days[1].events).toEqual([
        { impact: 'POSITIVE', title: 'Promo night', description: null },
      ]);

      const list = await as().get('/api/admin/events?from=2026-10-12&to=2026-10-18').expect(200);
      expect(list.headers['x-total-count']).toBe('3');
      expect(list.body.map((e: { title: string }) => e.title)).toEqual([
        'Promo night',
        'Heavy rain',
        'Local food festival',
      ]);

      const updated = await as()
        .put(`/api/admin/events/${created.body.id}`, {
          date: '2026-10-13',
          impact: 'NEGATIVE',
          title: 'Promo cancelled',
          description: 'Supplier issue',
        })
        .expect(200);
      expect(updated.body).toMatchObject({ impact: 'NEGATIVE', description: 'Supplier issue' });

      await as().delete(`/api/admin/events/${created.body.id}`).expect(204);
      await as()
        .put(`/api/admin/events/${created.body.id}`, {
          date: '2026-10-13',
          impact: 'NEGATIVE',
          title: 'x',
        })
        .expect(expectError(404, 'EVENT_NOT_FOUND', 'Event not found'));
    });

    it('validates the event body', async () => {
      const { body } = await as()
        .post('/api/admin/events', { date: 'tomorrow', impact: 'MAYBE', title: 'x'.repeat(121) })
        .expect(400);
      expect(body.details).toEqual({
        date: ['Use a valid date (YYYY-MM-DD)'],
        impact: ['Choose an impact'],
        title: ['Use at most 120 characters'],
      });
    });
  });
});
