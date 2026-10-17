import { z } from 'zod';
import { loadEnvFile, readEnv, splitCsv } from './env.js';

/**
 * Runtime configuration of the API, parsed and validated once at startup.
 * Read it only through the `APP_CONFIG` provider (or `loadAppConfig()` in scripts) — never `process.env`.
 * Seed-only variables (ADMIN_*, VIEWER_*) live in `database/seeds/seed-config.ts`; the API doesn't need them.
 */

/** The value shipped in .env.example — accepted locally, refused in production. */
const EXAMPLE_JWT_SECRET = 'dev-only-insecure-secret-change-me-0123456789';
const LOG_LEVELS = ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

const appEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    /** Express `trust proxy`: `loopback` (default), `true`, `false`, a hop count, or IPs/subnets. */
    TRUST_PROXY: z
      .string()
      .default('loopback')
      .transform((value): boolean | number | string => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return /^\d+$/.test(value) ? Number(value) : value;
      }),

    /** postgres://user:password@host:5432/database (add `?sslmode=require` for managed Postgres). */
    DATABASE_URL: z
      .url()
      .refine((url) => /^postgres(ql)?:\/\//.test(url), 'Must be a postgres:// URL'),
    DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    /** Log every SQL statement (debugging only). */
    DB_LOGGING: z.stringbool().default(false),

    /** HMAC key for access tokens (JWT) and refresh tokens. Generate with: openssl rand -hex 32 */
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    /** `Secure` flag of the session cookie (HTTPS only). Defaults to true in production. */
    COOKIE_SECURE: z.stringbool().optional(),
    /** Login requests allowed per IP per minute (all attempts). */
    LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(30),
    /** Lifetime of an access token (JWT). Short: it can't be revoked before it expires… */
    ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(15),
    /** …a refresh token renews it. Sliding: each refresh extends the session by this much… */
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    /** …up to this many days after sign-in, then the user signs in again. */
    SESSION_MAX_DAYS: z.coerce.number().int().min(1).max(365).default(30),
    /** A just-rotated refresh token is still accepted this long (parallel requests), then reuse = theft. */
    REFRESH_REUSE_LEEWAY_SECONDS: z.coerce.number().int().min(0).max(300).default(30),
    /** Refresh requests allowed per IP per minute. */
    REFRESH_RATE_LIMIT: z.coerce.number().int().positive().default(120),
    /** Failed logins allowed per email + IP before a lockout… */
    LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(5),
    /** …that lasts this many minutes (counted from the first failure). */
    LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

    /** Browser origins allowed to call the API with cookies (comma-separated). */
    WEB_ORIGINS: z
      .string()
      .default('http://localhost:3000,http://localhost:3001')
      .transform(splitCsv)
      .pipe(z.array(z.url()).min(1)),

    LOG_LEVEL: z.enum(LOG_LEVELS).default('log'),
    /** `json` (one object per line, for log collectors) or `pretty`. Defaults to json in production. */
    LOG_FORMAT: z.enum(['json', 'pretty']).optional(),

    /** Serve Swagger UI at /api/docs. Defaults to on, except in production. */
    SWAGGER_ENABLED: z.stringbool().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.REFRESH_TOKEN_TTL_DAYS > env.SESSION_MAX_DAYS) {
      ctx.addIssue({
        code: 'custom',
        path: ['REFRESH_TOKEN_TTL_DAYS'],
        message: 'REFRESH_TOKEN_TTL_DAYS cannot exceed SESSION_MAX_DAYS',
      });
    }
    if (env.NODE_ENV === 'production' && env.JWT_SECRET === EXAMPLE_JWT_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'Replace the example JWT_SECRET in production (openssl rand -hex 32)',
      });
    }
  });

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  trustProxy: boolean | number | string;
  database: { url: string; poolMax: number; logging: boolean };
  auth: {
    jwtSecret: string;
    cookieSecure: boolean;
    loginRateLimit: number;
    maxFailedLogins: number;
    lockoutMs: number;
    accessTokenTtlSeconds: number;
    refreshTokenTtlSeconds: number;
    sessionMaxSeconds: number;
    refreshReuseLeewaySeconds: number;
    refreshRateLimit: number;
  };
  cors: { origins: string[] };
  log: { level: LogLevel; json: boolean };
  swagger: { enabled: boolean };
}

export const APP_CONFIG = Symbol('APP_CONFIG');

export function parseAppConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const env = readEnv(appEnvSchema, source);
  const isProduction = env.NODE_ENV === 'production';
  return {
    env: env.NODE_ENV,
    isProduction,
    port: env.PORT,
    trustProxy: env.TRUST_PROXY,
    database: { url: env.DATABASE_URL, poolMax: env.DB_POOL_MAX, logging: env.DB_LOGGING },
    auth: {
      jwtSecret: env.JWT_SECRET,
      cookieSecure: env.COOKIE_SECURE ?? isProduction,
      loginRateLimit: env.LOGIN_RATE_LIMIT,
      maxFailedLogins: env.LOGIN_MAX_FAILED_ATTEMPTS,
      lockoutMs: env.LOGIN_LOCKOUT_MINUTES * 60_000,
      accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_MINUTES * 60,
      refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL_DAYS * 86_400,
      sessionMaxSeconds: env.SESSION_MAX_DAYS * 86_400,
      refreshReuseLeewaySeconds: env.REFRESH_REUSE_LEEWAY_SECONDS,
      refreshRateLimit: env.REFRESH_RATE_LIMIT,
    },
    cors: { origins: env.WEB_ORIGINS },
    log: {
      level: env.LOG_LEVEL,
      json: (env.LOG_FORMAT ?? (isProduction ? 'json' : 'pretty')) === 'json',
    },
    swagger: { enabled: env.SWAGGER_ENABLED ?? !isProduction },
  };
}

/** `.env` + validation in one call — for `main.ts` and the db:* scripts. */
export function loadAppConfig(): AppConfig {
  loadEnvFile();
  return parseAppConfig();
}
