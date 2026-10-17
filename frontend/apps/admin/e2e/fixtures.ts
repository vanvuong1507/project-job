import { expect, type Page } from '@playwright/test';

export const ADMIN = { email: 'admin@example.com', password: 'admin123', name: 'Restaurant Admin' };
export const VIEWER = {
  email: 'viewer@example.com',
  password: 'viewer123',
  name: 'Read-only Viewer',
};

/** Signs in through the UI and waits for the authenticated shell. */
export async function signIn(page: Page, next = '/', account = ADMIN) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password').fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('current-user')).toHaveText(account.name);
}
