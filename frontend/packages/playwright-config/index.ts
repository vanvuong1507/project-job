import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

export {
  captureEvidence,
  expectControlsWithinViewport,
  expectNoHorizontalScroll,
  VIEWPORTS,
  type ViewportPreset,
} from './responsive';

const isCI = !!process.env.CI;
/** `E2E_EVIDENCE=1`: keep a screenshot, video and trace of EVERY test (not only failures). */
const fullEvidence = process.env.E2E_EVIDENCE === '1' || process.env.E2E_EVIDENCE === 'true';

export interface AppE2EOptions {
  /** Port the Next.js app listens on (client 3000, admin 3001). */
  port: number;
  /** Extra/overriding Playwright options for this app. */
  overrides?: PlaywrightTestConfig;
}

/**
 * Shared Playwright config for Next.js apps in this monorepo.
 * Local: reuses a running `pnpm dev` or starts one. CI: runs the production build (`pnpm build` first).
 *
 * Evidence, all in the HTML report (`playwright-report/`, `pnpm test:e2e:report` to open it):
 * - default: screenshot, video and trace of every FAILED test, plus the screenshots tests attach
 *   themselves (`captureEvidence`, e.g. the responsive matrix);
 * - `E2E_EVIDENCE=1`: screenshot, video and trace of every test.
 * JUnit XML for CI dashboards goes to `test-results/junit.xml`.
 */
export function createAppE2EConfig({ port, overrides = {} }: AppE2EOptions) {
  const baseURL = `http://localhost:${port}`;

  return defineConfig({
    testDir: './e2e',
    outputDir: './test-results/artifacts',
    fullyParallel: true,
    forbidOnly: isCI,
    retries: isCI ? 2 : 0,
    workers: isCI ? 1 : undefined,
    reporter: [
      isCI ? ['github'] : ['list'],
      ['html', { open: 'never', outputFolder: 'playwright-report' }],
      ['junit', { outputFile: 'test-results/junit.xml' }],
    ],
    use: {
      baseURL,
      screenshot: fullEvidence ? 'on' : 'only-on-failure',
      video: fullEvidence ? 'on' : 'retain-on-failure',
      trace: fullEvidence ? 'on' : 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
      command: isCI ? 'pnpm start' : 'pnpm dev',
      url: baseURL,
      // Locally an already running server on this port is reused AS IS (its own data source).
      reuseExistingServer: !isCI,
      timeout: 120_000,
      // A server started by Playwright uses the mock data the specs expect, whatever the developer's
      // .env says. Integration runs opt in explicitly: DATA_SOURCE=api API_URL=… pnpm test:e2e.
      env: {
        DATA_SOURCE: process.env.DATA_SOURCE ?? 'mock',
        ENABLE_MOCK_API: process.env.ENABLE_MOCK_API ?? 'true',
      },
    },
    ...overrides,
  });
}
