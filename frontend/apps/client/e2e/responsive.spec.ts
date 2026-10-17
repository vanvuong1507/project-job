import {
  captureEvidence,
  expectControlsWithinViewport,
  expectNoHorizontalScroll,
  VIEWPORTS,
} from '@frontend/playwright-config';
import { expect, test } from '@playwright/test';

test.describe('mobile layout (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('stacks KPIs, scrolls the chart inside the card and never the page', async ({ page }) => {
    await page.goto('/');
    // The page streams (loading.tsx first) — measure only once the real chart has drawn its bars.
    await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();

    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(pageOverflow).toBeLessThanOrEqual(0);

    const chartScroller = page.getByTestId('revenue-chart').locator('..');
    await expect
      .poll(() => chartScroller.evaluate((el) => el.scrollWidth - el.clientWidth))
      .toBeGreaterThan(0);

    const total = await page.getByText('Total Revenue', { exact: true }).boundingBox();
    const average = await page.getByText('Average per Day', { exact: true }).boundingBox();
    expect(average!.y).toBeGreaterThan(total!.y); // stacked, not side by side
  });

  test('event tooltip stays readable on mobile', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Positive event impact, Sat' }).focus();
    await expect(page.getByRole('tooltip')).toBeInViewport();
  });
});

/** Every device size: no sideways page scroll, no control off-screen, screenshot in the report. */
for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} ${viewport.width}×${viewport.height}`, () => {
    test.use({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile,
    });

    for (const path of ['/', '/vi']) {
      test(`dashboard ${path} fits the screen`, async ({ page }, testInfo) => {
        await page.goto(path);
        await expect(page.locator('.recharts-bar-rectangle').first()).toBeVisible();

        await expectNoHorizontalScroll(page);
        // The chart scrolls inside the card on purpose below md (with a visible hint).
        await expectControlsWithinViewport(page, '[data-testid="revenue-chart"]');
        await expect(page.getByTestId('chart-scroll-hint')).toBeVisible({
          visible: viewport.width < 768,
        });
        await captureEvidence(page, testInfo, `dashboard ${path} @ ${viewport.width}px`);
      });
    }
  });
}
