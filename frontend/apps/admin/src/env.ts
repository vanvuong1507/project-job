import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Typed, validated environment. Imported by next.config.ts, so invalid values fail `next build`/`next dev`.
 * Server vars throw if read in the browser; client vars must start with NEXT_PUBLIC_ (inlined at build time).
 */
export const env = createEnv({
  server: {
    /** `mock`: file-backed store (no backend yet). `api`: the real backend at API_URL. */
    DATA_SOURCE: z.enum(['mock', 'api']).default('mock'),
    /** Backend base URL, required when DATA_SOURCE=api. Server-only. */
    API_URL: z.url().optional(),
    /** Expose the mock JSON API (/api/auth/*, /api/admin/*). Keep off in production. */
    ENABLE_MOCK_API: z.stringbool().default(false),
    /** Minimum server log level (debug | info | warn | error). */
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    /**
     * HMAC key of the session JWT (both modes). `mock` signs with it; `api` only verifies the token the
     * backend issued, so it must equal the backend's `JWT_SECRET`.
     */
    AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
    /** Mock only: the seeded accounts (same defaults as the backend seed). Ignored in `api` mode. */
    ADMIN_EMAIL: z.email().default('admin@example.com'),
    ADMIN_PASSWORD: z.string().min(8).default('admin123'),
    ADMIN_NAME: z.string().min(1).default('Restaurant Admin'),
    VIEWER_EMAIL: z.email().default('viewer@example.com'),
    VIEWER_PASSWORD: z.string().min(8).default('viewer123'),
    VIEWER_NAME: z.string().min(1).default('Read-only Viewer'),
    /** Mock backend only: artificial latency, to see loading states. */
    MOCK_DELAY_MS: z.coerce.number().int().nonnegative().optional(),
  },
  client: {
    /** Public dashboard, for "View dashboard" links. */
    NEXT_PUBLIC_CLIENT_URL: z.url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_CLIENT_URL: process.env.NEXT_PUBLIC_CLIENT_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});
