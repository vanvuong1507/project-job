import { type AppConfig, parseAppConfig } from '../../src/config/app-config.js';
import { loadEnvFile } from '../../src/config/env.js';
import { parseSeedUsers, type SeedUser } from '../../src/database/seeds/seed-config.js';
import { databaseNameOf } from '../../src/database/utils/database-url.js';

/** The e2e database: TEST_DATABASE_URL, or DATABASE_URL with `_test` appended to the name. */
export function testDatabaseUrl(): string {
  loadEnvFile();
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL (or TEST_DATABASE_URL) in .env');
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `/${databaseNameOf(process.env.DATABASE_URL)}_test`;
  return url.toString();
}

/** App config for tests: the test database, Swagger on, and a login limit tests won't hit. */
export function testConfig(overrides: Record<string, string> = {}): AppConfig {
  return parseAppConfig({
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: testDatabaseUrl(),
    JWT_SECRET: 'test-secret-test-secret-test-secret-0123',
    LOGIN_MAX_FAILED_ATTEMPTS: '5',
    LOGIN_LOCKOUT_MINUTES: '15',
    WEB_ORIGINS: 'http://localhost:3000,http://localhost:3001',
    LOGIN_RATE_LIMIT: '1000',
    COOKIE_SECURE: 'false',
    SWAGGER_ENABLED: 'true',
    LOG_LEVEL: 'error',
    ...overrides,
  });
}

/** The two seeded accounts with fixed test values (independent of the developer's .env). */
export const testSeedUsers: SeedUser[] = parseSeedUsers({
  ADMIN_EMAIL: 'admin@example.com',
  ADMIN_PASSWORD: 'admin123',
  ADMIN_NAME: 'Test Admin',
  VIEWER_EMAIL: 'viewer@example.com',
  VIEWER_PASSWORD: 'viewer123',
  VIEWER_NAME: 'Test Viewer',
});
