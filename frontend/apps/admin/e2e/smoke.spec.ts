import { expect, test } from '@playwright/test';

test('signed-out visitors land on the login page', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login\?next=%2F$/);
  await expect(page).toHaveTitle(/Sign in/);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
