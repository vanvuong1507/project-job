import { parseAppConfig } from './app-config.js';

const base = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
};

describe('parseAppConfig', () => {
  it('applies development defaults', () => {
    const config = parseAppConfig(base);
    expect(config).toMatchObject({
      env: 'development',
      isProduction: false,
      port: 4000,
      trustProxy: 'loopback',
      database: { poolMax: 10, logging: false },
      auth: { cookieSecure: false, loginRateLimit: 30, maxFailedLogins: 5, lockoutMs: 15 * 60_000 },
      cors: { origins: ['http://localhost:3000', 'http://localhost:3001'] },
      log: { level: 'log', json: false },
      swagger: { enabled: true },
    });
  });

  it('does not need the seed-only variables', () => {
    expect(() => parseAppConfig(base)).not.toThrow();
  });

  it('switches to production defaults', () => {
    const config = parseAppConfig({ ...base, NODE_ENV: 'production' });
    expect(config.auth.cookieSecure).toBe(true);
    expect(config.log.json).toBe(true);
    expect(config.swagger.enabled).toBe(false);
  });

  it('lets explicit values override production defaults', () => {
    const config = parseAppConfig({
      ...base,
      NODE_ENV: 'production',
      COOKIE_SECURE: 'false',
      LOG_FORMAT: 'pretty',
      SWAGGER_ENABLED: 'true',
      TRUST_PROXY: '1',
    });
    expect(config).toMatchObject({
      auth: { cookieSecure: false },
      log: { json: false },
      swagger: { enabled: true },
      trustProxy: 1,
    });
  });

  it('refuses the example JWT secret in production only', () => {
    const example = { ...base, JWT_SECRET: 'dev-only-insecure-secret-change-me-0123456789' };
    expect(() => parseAppConfig(example)).not.toThrow();
    expect(() => parseAppConfig({ ...example, NODE_ENV: 'production' })).toThrow(
      /Replace the example JWT_SECRET/,
    );
  });

  it('parses comma-separated origins and treats empty values as unset', () => {
    const config = parseAppConfig({
      ...base,
      WEB_ORIGINS: 'http://a.test, http://b.test',
      PORT: '',
    });
    expect(config.cors.origins).toEqual(['http://a.test', 'http://b.test']);
    expect(config.port).toBe(4000);
  });

  it('lists every invalid variable in one error', () => {
    expect(() =>
      parseAppConfig({ DATABASE_URL: 'mysql://x', JWT_SECRET: 'short', LOG_LEVEL: 'loud' }),
    ).toThrow(/DATABASE_URL[\s\S]*JWT_SECRET[\s\S]*LOG_LEVEL/);
  });
});
