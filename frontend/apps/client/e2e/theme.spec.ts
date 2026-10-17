import { expect, test } from '@playwright/test';

test.describe('theme', () => {
  test.use({ colorScheme: 'light' });

  test('dark theme applies immediately and persists across reloads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.getByLabel('Theme').selectOption('dark');
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByLabel('Theme')).toHaveValue('dark');
  });

  test.describe('system', () => {
    test.use({ colorScheme: 'dark' });

    test('follows the operating system by default', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('html')).toHaveClass(/dark/);
      await expect(page.getByLabel('Theme')).toHaveValue('system');
    });
  });
});
