import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Typed, validated environment. Imported by next.config.ts, so invalid values fail `next build`/`next dev`.
 * Server vars throw if read in the browser; only `src/server/**` should read them.
 */
export const env = createEnv({
  server: {
    /** `mock`: in-process fixtures (no backend yet). `api`: the real backend at API_URL. */
    DATA_SOURCE: z.enum(['mock', 'api']).default('mock'),
    /** Backend base URL, required when DATA_SOURCE=api. Server-only: the browser never calls the API. */
    API_URL: z.url().optional(),
    /** Expose the mock JSON endpoint (/api/dashboard/revenue-trend). Keep off in production. */
    ENABLE_MOCK_API: z.stringbool().default(false),
    /** Artificial latency for the mock source, to exercise loading states. */
    MOCK_DELAY_MS: z.coerce.number().int().nonnegative().optional(),
    /** Minimum server log level (debug | info | warn | error). */
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  },
  client: {
    /** Public origin of the site — metadataBase, canonical/alternate links, sitemap, robots. */
    NEXT_PUBLIC_SITE_URL: z.url().default('http://localhost:3000'),
    /** Optional collector for Core Web Vitals (POST beacons). */
    NEXT_PUBLIC_VITALS_URL: z.url().optional(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VITALS_URL: process.env.NEXT_PUBLIC_VITALS_URL,
  },
  emptyStringAsUndefined: true,
  skipValidation: process.env.SKIP_ENV_VALIDATION === 'true',
});
