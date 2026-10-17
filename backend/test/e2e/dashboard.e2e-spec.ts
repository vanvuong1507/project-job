import { revenueTrendResponseSchema } from '../../src/modules/dashboard/dto/revenue-trend.dto.js';
import { errorBody } from '../utils/assertions.js';
import { createTestApp, type TestApp } from '../utils/test-app.js';

describe('GET /api/dashboard/revenue-trend', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => t.reset());
  afterAll(() => t.close());

  it('returns the latest week with data, matching the reference video', async () => {
    const { body, headers } = await t.http().get('/api/dashboard/revenue-trend').expect(200);

    expect(headers['cache-control']).toBe('no-store');
    expect(revenueTrendResponseSchema.strict().parse(body)).toEqual(body); // documented contract
    expect(body.week).toEqual({ start: '2026-10-12', end: '2026-10-18' });
    expect(body.previous).toEqual({ start: '2026-10-05', end: '2026-10-11' });
    expect(body.days).toHaveLength(7);
    expect(body.summary).toEqual({
      totalRevenue: { current: 15974, previous: 14982, changePct: 6.6 },
      averagePerDay: { current: 2282, previous: 2140, changePct: 6.6 },
      totalCovers: { current: 871, previous: 820, changePct: 6.2 },
    });
    expect(body.days[4]).toEqual({
      dayLabel: 'Fri',
      date: '2026-10-16',
      current: { posRevenue: 1720, eatclubRevenue: 310, labourCost: 580, covers: 112 },
      previous: { posRevenue: 1690, eatclubRevenue: 280, labourCost: 580, covers: 106 },
      events: [
        {
          impact: 'NEGATIVE',
          title: 'Heavy rain',
          description: 'Storm warning kept walk-in traffic low all evening.',
        },
      ],
    });
  });

  it('selects a week with ?weekStart=', async () => {
    const { body } = await t
      .http()
      .get('/api/dashboard/revenue-trend?weekStart=2026-10-05')
      .expect(200);
    expect(body.week.start).toBe('2026-10-05');
    expect(body.summary.totalRevenue.current).toBe(14982);
    expect(body.summary.totalRevenue.changePct).toBeNull(); // nothing the week before
  });

  it('returns 7 zero days for a week without data', async () => {
    const { body } = await t
      .http()
      .get('/api/dashboard/revenue-trend?weekStart=2030-01-07')
      .expect(200);
    expect(body.days).toHaveLength(7);
    expect(body.summary.totalCovers).toEqual({ current: 0, previous: 0, changePct: null });
  });

  it.each(['2026-10-13', '2026-13-01', 'last-week'])(
    'rejects weekStart=%s with 400',
    async (value) => {
      const { body } = await t
        .http()
        .get(`/api/dashboard/revenue-trend?weekStart=${value}`)
        .expect(400);
      expect(body).toEqual(
        errorBody(400, 'VALIDATION_FAILED', 'Validation failed', {
          weekStart: [expect.any(String)],
        }),
      );
    },
  );

  it('falls back to the current week when the database is empty', async () => {
    await t.app.get((await import('typeorm')).DataSource).query('TRUNCATE daily_metrics');
    const { body } = await t.http().get('/api/dashboard/revenue-trend').expect(200);
    expect(new Date(`${body.week.start}T00:00:00Z`).getUTCDay()).toBe(1);
  });
});
