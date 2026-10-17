import { expect, test, type APIRequestContext, type BrowserContext } from '@playwright/test';
import { ADMIN, signIn } from './fixtures';

/**
 * Refresh-token sessions (same contract in mock and api mode): short-lived access token + rotating
 * refresh token. The proxy refreshes before pages and Server Actions run, so an expired access token
 * never signs the user out; logout and a replayed refresh token end the session.
 */

const CREDENTIALS = { email: ADMIN.email, password: ADMIN.password };

const cookieFrom = (setCookie: string | undefined, name: string) =>
  (setCookie ?? '')
    .split('\n')
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split(';')[0]!
    .slice(name.length + 1);

async function login(request: APIRequestContext) {
  const response = await request.post('/api/auth/login', { data: CREDENTIALS });
  expect(response.status()).toBe(200);
  return {
    access: cookieFrom(response.headers()['set-cookie'], 'admin_session')!,
    refresh: cookieFrom(response.headers()['set-cookie'], 'admin_refresh')!,
  };
}

const refresh = (request: APIRequestContext, refreshToken: string) =>
  request.post('/api/auth/refresh', { data: { refreshToken } });

const sessionCookies = async (context: BrowserContext) =>
  Object.fromEntries(
    (await context.cookies())
      .filter(({ name }) => name.startsWith('admin_'))
      .map(({ name, value }) => [name, value]),
  );

test.describe('API: /api/auth/refresh', () => {
  test('rotates: new access + refresh tokens, and the user', async ({ request }) => {
    const session = await login(request);
    const response = await refresh(request, session.refresh);

    expect(response.status()).toBe(200);
    expect((await response.json()).user).toMatchObject({ email: ADMIN.email });
    const next = cookieFrom(response.headers()['set-cookie'], 'admin_refresh');
    expect(next).toBeTruthy();
    expect(next).not.toBe(session.refresh);
  });

  test('answers a just-rotated token with the same successor, then detects replay', async ({
    request,
  }) => {
    const session = await login(request);
    const first = await refresh(request, session.refresh);
    const parallel = await refresh(request, session.refresh); // e.g. two tabs at once
    const gen1 = cookieFrom(first.headers()['set-cookie'], 'admin_refresh')!;
    expect(cookieFrom(parallel.headers()['set-cookie'], 'admin_refresh')).toBe(gen1);

    const gen2 = cookieFrom(
      (await refresh(request, gen1)).headers()['set-cookie'],
      'admin_refresh',
    )!;
    const replay = await refresh(request, session.refresh); // two generations old: theft
    expect(replay.status()).toBe(401);
    expect((await replay.json()).code).toBe('REFRESH_TOKEN_REUSED');
    expect((await refresh(request, gen2)).status()).toBe(401); // the whole session is revoked
  });

  test('rejects an invalid token and clears the cookies', async ({ request }) => {
    const response = await refresh(request, 'not-a-token');
    expect(response.status()).toBe(401);
    expect((await response.json()).code).toBe('INVALID_REFRESH_TOKEN');
    expect(response.headers()['set-cookie']).toMatch(/admin_refresh=;/);
  });

  test('logout revokes the session: the refresh token stops working', async ({ request }) => {
    const session = await login(request);
    expect((await request.post('/api/auth/logout')).status()).toBe(204);
    expect((await refresh(request, session.refresh)).status()).toBe(401);
  });
});

test.describe('browser session', () => {
  test('an expired access token is refreshed transparently on navigation', async ({
    page,
    context,
  }) => {
    await signIn(page);
    const before = await sessionCookies(context);
    expect(Object.keys(before).sort()).toEqual(['admin_refresh', 'admin_session']);

    // The access cookie expires (Max-Age): only the refresh token is left.
    await context.clearCookies({ name: 'admin_session' });
    await page.goto('/events?weekStart=2026-10-12');

    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();
    await expect(page.getByTestId('current-user')).toHaveText(ADMIN.name);
    const after = await sessionCookies(context);
    expect(after.admin_session).toBeTruthy();
    expect(after.admin_refresh).not.toBe(before.admin_refresh); // rotated
  });

  test('a Server Action still works after the access token expired', async ({ page, context }) => {
    await signIn(page, '/events?weekStart=2026-10-12');
    await context.clearCookies({ name: 'admin_session' });

    await page.getByRole('button', { name: 'Add event' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add event' });
    await dialog.getByLabel('Impact').selectOption('POSITIVE');
    await dialog.getByLabel('Title').fill('Refreshed session');
    await dialog.getByRole('button', { name: 'Add event' }).click();

    await expect(page.getByRole('row').filter({ hasText: 'Refreshed session' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete Refreshed session' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('row').filter({ hasText: 'Refreshed session' })).toHaveCount(0);
  });

  test('after logout, the old refresh token cannot bring the session back', async ({
    page,
    context,
  }) => {
    await signIn(page);
    const { admin_refresh: oldRefresh } = await sessionCookies(context);
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await context.addCookies([
      { name: 'admin_refresh', value: oldRefresh!, url: 'http://localhost:3001' },
    ]);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login\?next=%2F$/);
    expect(await sessionCookies(context)).toEqual({}); // the dead refresh cookie was cleared
  });

  test('a forged refresh token leads to the login page', async ({ page, context }) => {
    await context.addCookies([
      { name: 'admin_refresh', value: 'forged.0.token', url: 'http://localhost:3001' },
    ]);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login\?next=%2F$/);
  });
});
