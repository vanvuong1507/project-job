import { defineConfig } from 'vitest/config';

// E2E tests: test/e2e/**/*.e2e-spec.ts against a real Postgres database (DATABASE_URL + `_test`,
// or TEST_DATABASE_URL), created and migrated by the global setup. Files run one at a time
// because they share that database.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['test/e2e/**/*.e2e-spec.ts'],
    globalSetup: ['./test/utils/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
