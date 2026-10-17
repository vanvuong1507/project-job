import { expect, test } from '@playwright/test';

const CREDENTIALS = { email: 'admin@example.com', password: 'admin123' };

test.describe('mock API: /api/auth', () => {
  test('rejects wrong credentials', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: { ...CREDENTIALS, password: 'nope' },
    });
    expect(response.status()).toBe(401);
    // The backend's error body (backend/docs/API.md), identical in mock and api mode.
    expect(await response.json()).toEqual({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      error: 'Invalid credentials',
      requestId: response.headers()['x-request-id'],
      path: '/api/auth/login',
      timestamp: expect.any(String),
    });
  });

  test('validates the body', async ({ request }) => {
    const response = await request.post('/api/auth/login', { data: { email: 'not-an-email' } });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.details).toHaveProperty('email');
  });

  test('logs in with httpOnly access + refresh cookies, exposes /me, and logs out', async ({
    request,
  }) => {
    expect((await request.get('/api/auth/me')).status()).toBe(401);

    const login = await request.post('/api/auth/login', { data: CREDENTIALS });
    expect(login.status()).toBe(200);
    expect((await login.json()).user).toMatchObject({ email: CREDENTIALS.email });
    // Attribute order/casing is up to the framework; assert each attribute.
    const cookies = (login.headers()['set-cookie'] ?? '').split('\n');
    const access = cookies.find((cookie) => cookie.startsWith('admin_session='));
    const refresh = cookies.find((cookie) => cookie.startsWith('admin_refresh='));
    expect(access).toMatch(/; Max-Age=900(;|$)/i); // 15-minute access token
    expect(refresh).toMatch(/; Max-Age=604800(;|$)/i); // 7-day refresh token
    for (const cookie of [access, refresh]) {
      for (const attribute of [/; HttpOnly/i, /; SameSite=Lax/i]) expect(cookie).toMatch(attribute);
    }

    const me = await request.get('/api/auth/me');
    expect(me.status()).toBe(200);
    expect((await me.json()).user.email).toBe(CREDENTIALS.email);

    expect((await request.post('/api/auth/logout')).status()).toBe(204);
    expect((await request.get('/api/auth/me')).status()).toBe(401);
  });
});
