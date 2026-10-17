import 'server-only';

/** Brute-force protection (docs: production-checklist → rate limiting). */
export interface RateLimiter {
  /** Whether another attempt is allowed now, and if not, when the oldest failure expires. */
  check(key: string): { allowed: true } | { allowed: false; retryAfterSeconds: number };
  recordFailure(key: string): void;
  reset(key: string): void;
}

/**
 * Sliding-window limiter kept in process memory — fine for the mock / a single instance.
 * Multi-instance deployments need a shared store (e.g. Redis) behind the same interface.
 */
export function createInMemoryRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const failures = new Map<string, number[]>();

  const recent = (key: string) => {
    const cutoff = now() - windowMs;
    const kept = (failures.get(key) ?? []).filter((time) => time > cutoff);
    if (kept.length) failures.set(key, kept);
    else failures.delete(key);
    return kept;
  };

  return {
    check(key) {
      const attempts = recent(key);
      if (attempts.length < limit) return { allowed: true };
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil((attempts[0]! + windowMs - now()) / 1000),
      };
    },
    recordFailure(key) {
      failures.set(key, [...recent(key), now()]);
    },
    reset(key) {
      failures.delete(key);
    },
  };
}

/** 5 failed logins per email+IP per 15 minutes. One instance per process (route bundles share it). */
export const loginRateLimiter: RateLimiter = ((
  globalThis as { __loginRateLimiter?: RateLimiter }
).__loginRateLimiter ??= createInMemoryRateLimiter({ limit: 5, windowMs: 15 * 60_000 }));
