import { expect, type Page, type TestInfo } from '@playwright/test';

export interface ViewportPreset {
  name: string;
  width: number;
  height: number;
  /** Touch device: mobile meta viewport and touch events. */
  mobile: boolean;
}

/** Device sizes every page must work on (phones → large desktop). */
export const VIEWPORTS: readonly ViewportPreset[] = [
  { name: 'phone-small (iPhone SE 1st gen)', width: 320, height: 568, mobile: true },
  { name: 'phone (iPhone SE)', width: 375, height: 667, mobile: true },
  { name: 'phone-large (iPhone Pro Max)', width: 430, height: 932, mobile: true },
  { name: 'tablet portrait (iPad mini)', width: 768, height: 1024, mobile: true },
  { name: 'tablet landscape (iPad)', width: 1024, height: 768, mobile: true },
  { name: 'laptop', width: 1366, height: 768, mobile: false },
  { name: 'desktop (Full HD)', width: 1920, height: 1080, mobile: false },
];

/** The page itself never scrolls sideways (wide content scrolls inside its own container). */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, 'page scrolls horizontally').toBeLessThanOrEqual(0);
}

/**
 * Every visible input, button, select and link lies within the viewport width, i.e. no control is
 * hidden off-screen in a sideways-scrolling container. `ignore`: a selector for regions that scroll
 * on purpose (e.g. a chart).
 */
export async function expectControlsWithinViewport(page: Page, ignore?: string): Promise<void> {
  const offscreen = await page.evaluate((ignoreSelector) => {
    const width = document.documentElement.clientWidth;
    return [...document.querySelectorAll('input, button, select, textarea, a[href]')]
      .filter((element) => !(ignoreSelector && element.closest(ignoreSelector)))
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && (box.left < 0 || box.right > width + 1);
      })
      .map((element) => element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '');
  }, ignore);
  expect(offscreen, 'controls outside the viewport').toEqual([]);
}

/** Attaches a full-page screenshot to the HTML report (evidence even when the test passes). */
export async function captureEvidence(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}
