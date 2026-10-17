import type { RevenueTrendResponse } from '@frontend/api-client';
import { expect, test } from '@playwright/test';

const ENDPOINT = '/api/dashboard/revenue-trend';

test.describe('mock API: GET /api/dashboard/revenue-trend', () => {
  test('returns the latest week in the §1.2 shape', async ({ request }) => {
    const response = await request.get(ENDPOINT);

    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    const body = (await response.json()) as RevenueTrendResponse;
    expect(body.week).toEqual({ start: '2026-10-12', end: '2026-10-18' });
    expect(body.days).toHaveLength(7);
    expect(body.summary.totalRevenue).toEqual({ current: 15974, previous: 14982, changePct: 6.6 });
    expect(body.summary.totalCovers).toEqual({ current: 871, previous: 820, changePct: 6.2 });
  });

  test('selects a week with ?weekStart=', async ({ request }) => {
    const body = (await (
      await request.get(`${ENDPOINT}?weekStart=2026-10-05`)
    ).json()) as RevenueTrendResponse;

    expect(body.week.start).toBe('2026-10-05');
    expect(body.summary.totalRevenue.current).toBe(14982);
  });

  test('rejects a weekStart that is not a Monday', async ({ request }) => {
    const response = await request.get(`${ENDPOINT}?weekStart=2026-10-13`);

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      requestId: response.headers()['x-request-id'],
      error: 'Validation failed',
      details: { weekStart: [expect.any(String)] },
    });
  });
});
