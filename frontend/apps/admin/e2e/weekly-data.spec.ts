import { expect, test, type Page } from '@playwright/test';
import { signIn } from './fixtures';

/** Writes go to a random far-future week so parallel tests never share rows. */
function uniqueMonday(): string {
  const monday = new Date(Date.UTC(2031, 0, 6) + Math.floor(Math.random() * 5000) * 7 * 86_400_000);
  return monday.toISOString().slice(0, 10);
}

const cell = (page: Page, field: string, day: string) =>
  page.getByLabel(new RegExp(`^${field}, ${day} `));

test.describe('weekly data', () => {
  test.beforeEach(async ({ page }) => signIn(page));

  test('shows the seeded week with live totals and a dashboard link', async ({ page }) => {
    await page.goto('/?weekStart=2026-10-12');

    await expect(cell(page, 'POS Revenue', 'Mon')).toHaveValue('1720');
    await expect(page.getByTestId('total-revenue')).toHaveText('Revenue $15,974');
    await expect(page.getByTestId('total-covers')).toHaveText('Covers 871');
    await expect(page.getByRole('link', { name: 'View dashboard for this week' })).toHaveAttribute(
      'href',
      'http://localhost:3000/?weekStart=2026-10-12',
    );

    await cell(page, 'Covers', 'Mon').fill('128');
    await expect(page.getByTestId('total-covers')).toHaveText('Covers 881');

    // An invalid cell only drops itself from the totals, not the rest of its day.
    await cell(page, 'Covers', 'Wed').fill('-3');
    await expect(page.getByTestId('total-revenue')).toHaveText('Revenue $15,974');
    await expect(page.getByTestId('total-covers')).toHaveText('Covers 760');
  });

  test('saves a week and keeps the values after reload', async ({ page }) => {
    const week = uniqueMonday();
    await page.goto(`/?weekStart=${week}`);

    await cell(page, 'POS Revenue', 'Mon').fill('1234.56');
    await cell(page, 'Covers', 'Sun').fill('42');
    await page.getByRole('button', { name: 'Save week' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Week saved' })).toBeVisible();

    await page.reload();
    await expect(cell(page, 'POS Revenue', 'Mon')).toHaveValue('1234.56');
    await expect(cell(page, 'Covers', 'Sun')).toHaveValue('42');
  });

  test('validates fields and blocks saving', async ({ page }) => {
    await page.goto(`/?weekStart=${uniqueMonday()}`);

    await cell(page, 'Labour Cost', 'Tue').fill('-5');
    await cell(page, 'Covers', 'Wed').fill('2.5');
    await cell(page, 'Eatclub Revenue', 'Thu').fill('10.123');

    await expect(page.getByText('Must be 0 or more')).toBeVisible();
    await expect(page.getByText('Must be a whole number')).toBeVisible();
    await expect(page.getByText('Use at most 2 decimals')).toBeVisible();
    await expect(cell(page, 'Labour Cost', 'Tue')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('button', { name: 'Save week' })).toBeDisabled();
  });

  test('navigates weeks and guards unsaved changes', async ({ page }) => {
    await page.goto('/?weekStart=2026-10-12');
    await page.getByRole('link', { name: 'Next week' }).click();
    await expect(page).toHaveURL(/weekStart=2026-10-19$/);

    await cell(page, 'Covers', 'Mon').fill('7');
    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('link', { name: 'Previous week' }).click();
    await expect(page).toHaveURL(/weekStart=2026-10-19$/);

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('link', { name: 'Previous week' }).click();
    await expect(page).toHaveURL(/weekStart=2026-10-12$/);
  });

  test('never scrolls the page horizontally on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?weekStart=2026-10-12');
    await expect(cell(page, 'POS Revenue', 'Mon')).toHaveValue('1720');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
