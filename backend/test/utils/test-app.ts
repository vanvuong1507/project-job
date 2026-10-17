import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/bootstrap/configure-app.js';
import { createLogger } from '../../src/bootstrap/logger.js';
import type { Role } from '../../src/modules/auth/permissions.js';
import { REFRESH_COOKIE, SESSION_COOKIE } from '../../src/modules/auth/auth.constants.js';
import { seedDatabase } from '../../src/database/seeds/seed.js';
import { testConfig, testSeedUsers } from './test-env.js';

export interface SessionTokens {
  access: string;
  refresh: string;
  cookie: string;
}

/** `name=value` of a cookie in a response's Set-Cookie headers. */
export function cookieValue(setCookie: unknown, name: string): string | undefined {
  return ([] as string[])
    .concat((setCookie as string[] | string | undefined) ?? [])
    .find((value) => value.startsWith(`${name}=`))
    ?.split(';')[0]!
    .slice(name.length + 1);
}

export interface TestApp {
  app: INestApplication;
  http: () => ReturnType<typeof request>;
  /** Empties every table and re-seeds the demo data + both accounts. */
  reset: () => Promise<void>;
  /** `Cookie` header value (access token only) for a logged-in seeded user (ADMIN by default). */
  login: (role?: Role) => Promise<string>;
  /** Signs in and returns both tokens (raw values) plus a `Cookie` header carrying both. */
  signIn: (role?: Role) => Promise<SessionTokens>;
  dataSource: DataSource;
  close: () => Promise<void>;
}

/** Boots the real AppModule with the real HTTP pipeline (`configureApp`) on the test database. */
export async function createTestApp(overrides: Record<string, string> = {}): Promise<TestApp> {
  const config = testConfig(overrides);
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config)],
  }).compile();
  const logger = createLogger(config);
  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
    logger,
  });
  configureApp(app, config, logger);
  await app.init();

  const dataSource = app.get(DataSource);
  const http = () => request(app.getHttpServer());

  async function signIn(role: Role = 'ADMIN'): Promise<SessionTokens> {
    const { email, password } = testSeedUsers.find((user) => user.role === role)!;
    const response = await http().post('/api/auth/login').send({ email, password }).expect(200);
    const access = cookieValue(response.headers['set-cookie'], SESSION_COOKIE);
    const refresh = cookieValue(response.headers['set-cookie'], REFRESH_COOKIE);
    if (!access || !refresh) throw new Error('Login did not set both session cookies');
    return { access, refresh, cookie: `${SESSION_COOKIE}=${access}; ${REFRESH_COOKIE}=${refresh}` };
  }

  return {
    app,
    http,
    async reset() {
      await dataSource.query('TRUNCATE admin_users, auth_sessions, daily_metrics, event_impacts');
      await seedDatabase(dataSource, testSeedUsers);
    },
    login: async (role: Role = 'ADMIN') => `${SESSION_COOKIE}=${(await signIn(role)).access}`,
    signIn,
    dataSource,
    close: () => app.close(),
  };
}
