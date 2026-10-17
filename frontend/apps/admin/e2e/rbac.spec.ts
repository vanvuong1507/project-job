import { expect, test } from '@playwright/test';
import { signIn, VIEWER } from './fixtures';

test.describe('role-based access', () => {
  test('a viewer sees read-only weekly data and events', async ({ page }) => {
    await signIn(page, '/', VIEWER);
    await expect(page.getByTestId('current-role')).toHaveText('Viewer');

    await page.goto('/?weekStart=2026-10-12');
    await expect(page.getByLabel(/^POS Revenue, Mon /)).toHaveAttribute('readonly', '');
    await expect(page.getByRole('button', { name: 'Save week' })).toHaveCount(0);
    await expect(page.getByTestId('read-only-notice')).toBeVisible();

    await page.goto('/events?weekStart=2026-10-12');
    await expect(page.getByRole('row').filter({ hasText: 'Heavy rain' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add event' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Edit|Delete) / })).toHaveCount(0);
  });

  test('the server rejects a viewer’s writes even when the UI is bypassed', async ({ page }) => {
    await signIn(page, '/', VIEWER);
    const request = page.request; // shares the viewer's session cookie

    expect((await request.get('/api/admin/events?from=2026-10-12&to=2026-10-18')).status()).toBe(
      200,
    );
    const write = await request.put('/api/admin/weeks/2026-10-12', {
      data: { days: Array(7).fill({ posRevenue: 1, eatclubRevenue: 1, labourCost: 1, covers: 1 }) },
    });
    expect(write.status()).toBe(403);
    expect(
      (
        await request.post('/api/admin/events', {
          data: { date: '2026-10-12', impact: 'POSITIVE', title: 'x' },
        })
      ).status(),
    ).toBe(403);
  });

  test('the forbidden page explains access and links back', async ({ page }) => {
    await signIn(page, '/', VIEWER);
    await page.goto('/forbidden');
    // Next renders its own role="alert" route announcer, so scope to our message.
    const notice = page
      .getByRole('alert')
      .filter({ hasText: "You don't have access to this page" });
    await expect(notice).toContainText('viewer@example.com (Viewer)');
    await expect(notice.getByRole('link', { name: 'Back to Weekly Data' })).toBeVisible();
  });
});
