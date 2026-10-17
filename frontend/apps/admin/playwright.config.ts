import { createAppE2EConfig } from '@frontend/playwright-config';

export default createAppE2EConfig({
  port: 3001,
  overrides: { globalSetup: './e2e/global-setup.ts' },
});
