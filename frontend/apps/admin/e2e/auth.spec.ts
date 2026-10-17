import { expect, test } from '@playwright/test';
import { ADMIN, signIn } from './fixtures';

test.describe('authentication', () => {
  test('protects pages and returns to the requested page after login', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL(/\/login\?next=%2Fevents$/);

    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Password').fill(ADMIN.password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/events$/);
    await expect(page.getByRole('link', { name: 'Events' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('validates input and rejects wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Enter a valid email')).toBeVisible();

    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid credentials' })).toBeVisible();
  });

  test('a signed-in user skips the login page and can log out', async ({ page }) => {
    await signIn(page);

    await page.goto('/login');
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/);
    // The session must really be gone (a failing logout action would leave the cookie in place).
    expect((await page.context().cookies()).some((cookie) => cookie.name === 'admin_session')).toBe(
      false,
    );
    await page.goto('/');
    await expect(page).toHaveURL(/\/login\?next=%2F$/);
  });

  test('a stale session cookie falls back to the login page without looping', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: 'admin_session', value: 'expired-token', url: 'http://localhost:3001' },
    ]);

    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('locks out an email after 5 failed attempts', async ({ page }) => {
    // A unique, non-existent account so the lockout never affects other tests.
    const email = `locked-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const password = page.getByLabel('Password');
    await page.goto('/login');

    const attempt = async () => {
      await page.getByLabel('Email').fill(email);
      await password.fill('wrong-password');
      await page.getByRole('button', { name: 'Sign in' }).click();
      // React resets the form when the action settles: the password empties, the email is kept.
      await expect(password).toHaveValue('');
      await expect(page.getByLabel('Email')).toHaveValue(email);
    };

    for (let i = 1; i <= 5; i++) {
      await attempt();
      await expect(
        page.getByRole('alert').filter({ hasText: 'Invalid credentials' }),
      ).toBeVisible();
    }
    await attempt();
    await expect(
      page.getByRole('alert').filter({ hasText: /Too many attempts\. Try again in 15 minutes\./ }),
    ).toBeVisible();
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the login form still works (Server Action, progressive enhancement)', async ({
      page,
    }) => {
      await page.goto('/login?next=%2Fevents');
      await page.getByLabel('Email').fill(ADMIN.email);
      await page.getByLabel('Password').fill(ADMIN.password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      await expect(page).toHaveURL(/\/events$/);
      await expect(page.getByTestId('current-user')).toHaveText(ADMIN.name);
    });
  });
});
