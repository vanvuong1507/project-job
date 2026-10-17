import { expect, test } from '@playwright/test';

test.describe('dashboard page', () => {
  test('renders the latest week with KPIs from the mock API', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Revenue Trend/);
    await expect(
      page.getByRole('heading', { name: "This Week's Revenue Trend vs Previous Period" }),
    ).toBeVisible();

    const kpi = (label: string) =>
      page.locator('div', { has: page.getByText(label, { exact: true }) }).last();
    await expect(kpi('Total Revenue')).toContainText('$15,974vs $14,982 (+6.6%)');
    await expect(kpi('Average per Day')).toContainText('$2,282vs $2,140 (+6.6%)');
    await expect(kpi('Total Covers')).toContainText('871vs 820 (+6.2%)');
  });

  test('explains an invalid ?weekStart= instead of failing', async ({ page }) => {
    await page.goto('/?weekStart=2026-10-13');

    await expect(
      page.getByRole('alert').filter({ hasText: "This week can't be shown" }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Show the latest week' }).click();
    await expect(page.getByText('$15,974', { exact: true })).toBeVisible();
  });

  test('shows an empty state for a week without data', async ({ page }) => {
    await page.goto('/?weekStart=2026-01-05');

    await expect(
      page.getByRole('status').filter({ hasText: 'No revenue data for this week' }),
    ).toBeVisible();
  });
});
