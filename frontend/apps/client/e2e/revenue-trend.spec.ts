import { expect, test, type Page } from '@playwright/test';

const legendItems = (page: Page) =>
  page.getByRole('list', { name: 'Chart legend' }).getByRole('listitem');

test.describe('revenue trend card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Compare to Previous toggles title, legend and KPI comparison', async ({ page }) => {
    const compare = page.getByRole('button', { name: 'Compare to Previous' });
    await expect(compare).toHaveAttribute('aria-pressed', 'true');
    await expect(legendItems(page)).toHaveCount(8); // 6 series + 2 event keys

    await compare.click();

    await expect(compare).toHaveAttribute('aria-pressed', 'false');
    await expect(
      page.getByRole('heading', { name: "This Week's Revenue Trend", exact: true }),
    ).toBeVisible();
    await expect(legendItems(page)).toHaveCount(5); // 3 series + 2 event keys
    await expect(page.getByText('vs $14,982')).toHaveCount(0);
    await expect(page.getByText('$15,974', { exact: true })).toBeVisible();
  });

  test('series toggles dim the legend and keep at least one series', async ({ page }) => {
    const pos = page.getByRole('checkbox', { name: 'POS Revenue' });
    const eatclub = page.getByRole('checkbox', { name: 'Eatclub Revenue' });
    const labour = page.getByRole('checkbox', { name: 'Labour Costs' });

    await pos.click();
    await expect(pos).not.toBeChecked();
    await expect(legendItems(page).filter({ hasText: 'POS Revenue (Current)' })).toHaveClass(
      /opacity-40/,
    );
    await expect(page.getByText('$15,974', { exact: true })).toBeVisible(); // KPIs unchanged

    await eatclub.click();
    await expect(eatclub).not.toBeChecked();
    await expect(labour).toBeChecked();
    await expect(labour).toBeDisabled();

    await pos.click();
    await expect(pos).toBeChecked();
    await expect(labour).toBeEnabled();
  });

  test('chart shows the 0k–3k axis and bars for every visible series and period', async ({
    page,
  }) => {
    const chart = page.locator('.recharts-wrapper');
    for (const tick of ['0k', '0.75k', '1.5k', '2.25k', '3k']) {
      await expect(chart.getByText(tick, { exact: true })).toBeVisible();
    }
    const bars = chart.locator('.recharts-bar-rectangle');
    // 7 days × 3 series × (current + previous)
    await expect(bars).toHaveCount(42);

    await page.getByRole('button', { name: 'Compare to Previous' }).click();
    await expect(bars).toHaveCount(21);

    await page.getByRole('checkbox', { name: 'Labour Costs' }).click();
    await expect(page.getByRole('checkbox', { name: 'Labour Costs' })).not.toBeChecked();
    await expect(bars).toHaveCount(14);
  });

  test('event markers sit on Fri (negative) and Sat (positive) and explain the event', async ({
    page,
  }) => {
    const friday = page.getByRole('button', { name: 'Negative event impact, Fri' });
    const saturday = page.getByRole('button', { name: 'Positive event impact, Sat' });
    await expect(friday).toBeVisible();
    await expect(saturday).toBeVisible();

    await saturday.focus();
    await expect(page.getByRole('tooltip')).toContainText('Local food festival');
    await expect(saturday).toHaveAccessibleDescription(/Local food festival/);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toBeHidden();
  });

  test('Export PNG downloads the card for the current week', async ({ page }) => {
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export PNG' }).click();

    expect((await download).suggestedFilename()).toBe('revenue-trend-2026-10-12.png');
    await expect(page.getByRole('button', { name: 'Export PNG' })).toBeEnabled();
  });

  test('view state lives in the URL and survives a reload', async ({ page }) => {
    await page.goto('/?weekStart=2026-10-12&compare=0&series=pos');

    await expect(page.getByRole('button', { name: 'Compare to Previous' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.getByRole('checkbox', { name: 'POS Revenue' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Eatclub Revenue' })).not.toBeChecked();

    await page.getByRole('checkbox', { name: 'Labour Costs' }).click();
    await expect(page.getByRole('checkbox', { name: 'Labour Costs' })).toBeChecked();
    await page.getByRole('button', { name: 'Compare to Previous' }).click();
    await expect(page).toHaveURL(/\?weekStart=2026-10-12&series=pos%2Clabour$/);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Compare to Previous' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('checkbox', { name: 'Labour Costs' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Eatclub Revenue' })).not.toBeChecked();
  });
});
