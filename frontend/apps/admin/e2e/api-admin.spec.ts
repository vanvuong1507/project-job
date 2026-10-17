import { expect, test, type APIRequestContext } from '@playwright/test';

const day = { posRevenue: 100, eatclubRevenue: 50.25, labourCost: 40, covers: 10 };

/** Writes go to a random far-future week so parallel tests (and repeats) never share rows. */
function uniqueMonday(): string {
  const monday = new Date(Date.UTC(2030, 0, 7) + Math.floor(Math.random() * 5000) * 7 * 86_400_000);
  return monday.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

async function login(request: APIRequestContext) {
  const response = await request.post('/api/auth/login', {
    data: { email: 'admin@example.com', password: 'admin123' },
  });
  expect(response.ok()).toBe(true);
}

test.describe('mock API: /api/admin', () => {
  test('rejects calls without a session', async ({ request }) => {
    for (const path of ['/api/admin/daily-metrics', '/api/admin/events']) {
      const response = await request.get(path);
      expect(response.status()).toBe(401);
      expect((await response.json()).code).toBe('UNAUTHORIZED');
    }
    expect(
      (await request.put('/api/admin/weeks/2026-10-12', { data: { days: [] } })).status(),
    ).toBe(401);
  });

  test.describe('signed in', () => {
    test.beforeEach(async ({ request }) => login(request));

    test('lists the seeded week of daily metrics', async ({ request }) => {
      const response = await request.get('/api/admin/daily-metrics?from=2026-10-12&to=2026-10-18');
      const metrics = (await response.json()) as Array<typeof day & { date: string }>;

      expect(response.headers()['cache-control']).toBe('no-store');
      expect(response.headers()['x-total-count']).toBe('7');
      expect(metrics.map((m) => m.date)).toEqual([
        '2026-10-12',
        '2026-10-13',
        '2026-10-14',
        '2026-10-15',
        '2026-10-16',
        '2026-10-17',
        '2026-10-18',
      ]);
      expect(metrics.reduce((sum, m) => sum + m.posRevenue + m.eatclubRevenue, 0)).toBe(15974);
    });

    test('validates query, path and body', async ({ request }) => {
      const badQuery = await request.get('/api/admin/events?from=yesterday');
      expect(badQuery.status()).toBe(400);
      expect((await badQuery.json()).details).toHaveProperty('from');

      const notMonday = await request.put('/api/admin/weeks/2026-10-13', {
        data: { days: Array(7).fill(day) },
      });
      expect(notMonday.status()).toBe(400);
      expect((await notMonday.json()).details).toHaveProperty('weekStart');

      const badDay = await request.put(`/api/admin/weeks/${uniqueMonday()}`, {
        data: { days: Array(7).fill({ ...day, covers: -1 }) },
      });
      expect(badDay.status()).toBe(400);
    });

    test('upserts a week, then rejects a duplicate date and unknown ids', async ({ request }) => {
      const week = uniqueMonday();
      const upsert = await request.put(`/api/admin/weeks/${week}`, {
        data: { days: Array(7).fill(day) },
      });
      expect(upsert.status()).toBe(200);
      const { days } = (await upsert.json()) as { days: Array<{ id: string; date: string }> };
      expect(days.map((d) => d.date)).toEqual(
        Array.from({ length: 7 }, (_, i) => addDays(week, i)),
      );

      const duplicate = await request.post('/api/admin/daily-metrics', {
        data: { ...day, date: week },
      });
      expect(duplicate.status()).toBe(409);
      expect((await duplicate.json()).code).toBe('DAILY_METRIC_DATE_TAKEN');

      expect((await request.delete(`/api/admin/daily-metrics/${days[0]!.id}`)).status()).toBe(204);
      const gone = await request.delete(`/api/admin/daily-metrics/${days[0]!.id}`);
      expect(gone.status()).toBe(404);
      expect((await gone.json()).code).toBe('DAILY_METRIC_NOT_FOUND');

      const event = { date: week, impact: 'POSITIVE', title: 'x' };
      const malformedId = await request.put('/api/admin/events/missing', { data: event });
      expect(malformedId.status()).toBe(400);
      expect((await malformedId.json()).details).toHaveProperty('id');
      const unknownEvent = await request.put(`/api/admin/events/${crypto.randomUUID()}`, {
        data: event,
      });
      expect(unknownEvent.status()).toBe(404);
      expect((await unknownEvent.json()).code).toBe('EVENT_NOT_FOUND');
    });

    test('creates, updates and deletes an event', async ({ request }) => {
      const date = uniqueMonday();
      const created = await request.post('/api/admin/events', {
        data: { date, impact: 'NEGATIVE', title: 'Road works', description: '' },
      });
      expect(created.status()).toBe(201);
      const event = await created.json();
      expect(created.headers()['location']).toBe(`/api/admin/events/${event.id}`);
      expect(event).toMatchObject({ title: 'Road works', description: null });

      const updated = await request.put(`/api/admin/events/${event.id}`, {
        data: { ...event, title: 'Road closed' },
      });
      expect((await updated.json()).title).toBe('Road closed');

      expect((await request.delete(`/api/admin/events/${event.id}`)).status()).toBe(204);
      const list = await (
        await request.get('/api/admin/events?from=2026-11-03&to=2026-11-03')
      ).json();
      expect(list).toEqual([]);
    });
  });
});
