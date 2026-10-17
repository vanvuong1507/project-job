import {
  captureEvidence,
  expectControlsWithinViewport,
  expectNoHorizontalScroll,
  VIEWPORTS,
} from '@frontend/playwright-config';
import { expect, test } from '@playwright/test';
import { signIn } from './fixtures';

/**
 * Every device size: the page never scrolls sideways and no input or button is pushed off-screen
 * (tables become cards on small screens). A full-page screenshot of each page goes in the report.
 */
for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} ${viewport.width}×${viewport.height}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
    });

    test('login, weekly data and events fit the screen', async ({ page }, testInfo) => {
      const check = async (name: string) => {
        await expectNoHorizontalScroll(page);
        await expectControlsWithinViewport(page);
        await captureEvidence(page, testInfo, `${name} @ ${viewport.width}px`);
      };

      await page.goto('/login');
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
      await check('login');

      await signIn(page, '/?weekStart=2026-10-12');
      await expect(page.getByLabel(/^Covers, Sun /)).toBeVisible();
      await expect(page.getByTestId('total-covers')).toBeVisible();
      await check('weekly data');

      await page.goto('/events?weekStart=2026-10-12');
      await expect(page.getByRole('button', { name: 'Edit Heavy rain' })).toBeVisible();
      await check('events');
    });
  });
}
