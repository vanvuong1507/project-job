import { expect, test } from '@playwright/test';

test.describe('localisation', () => {
  test('/vi renders Vietnamese copy with Vietnamese number formats', async ({ page }) => {
    await page.goto('/vi?weekStart=2026-10-12');

    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(
      page.getByRole('heading', { name: 'Xu hướng doanh thu tuần này so với kỳ trước' }),
    ).toBeVisible();
    const total = page
      .locator('div', { has: page.getByText('Tổng doanh thu', { exact: true }) })
      .last();
    await expect(total).toContainText('15.974 US$');
    await expect(total).toContainText('(+6,6%)');
    await expect(
      page.getByRole('button', { name: 'Sự kiện tác động tiêu cực, Thứ 6' }),
    ).toBeVisible();
  });

  test('the switcher changes language and keeps the query', async ({ page }) => {
    await page.goto('/?weekStart=2026-10-05');
    await page.getByLabel('Language').selectOption('vi');

    await expect(page).toHaveURL(/\/vi\?weekStart=2026-10-05$/);
    await expect(page.getByLabel('Ngôn ngữ')).toHaveValue('vi');

    await page.getByLabel('Ngôn ngữ').selectOption('en');
    await expect(page).toHaveURL(/localhost:3000\/\?weekStart=2026-10-05$/);
  });

  test.describe('negotiation', () => {
    test.use({ locale: 'vi-VN' });

    test('a Vietnamese browser is sent to /vi', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/vi$/);
    });
  });
});
