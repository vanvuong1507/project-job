import { describe, expect, it } from 'vitest';
import { createInMemoryRateLimiter } from './rate-limit';

describe('createInMemoryRateLimiter', () => {
  it('blocks after the limit and frees attempts as they leave the window', () => {
    let time = 0;
    const limiter = createInMemoryRateLimiter({ limit: 3, windowMs: 60_000, now: () => time });

    for (let i = 0; i < 3; i++) {
      expect(limiter.check('a').allowed).toBe(true);
      limiter.recordFailure('a');
      time += 10_000;
    }
    expect(limiter.check('a')).toEqual({ allowed: false, retryAfterSeconds: 30 });
    expect(limiter.check('b').allowed).toBe(true); // keys are independent

    time = 60_001; // the first failure (t=0) has left the window
    expect(limiter.check('a').allowed).toBe(true);
  });

  it('resets a key after a success', () => {
    const limiter = createInMemoryRateLimiter({ limit: 1, windowMs: 60_000 });
    limiter.recordFailure('a');
    expect(limiter.check('a').allowed).toBe(false);
    limiter.reset('a');
    expect(limiter.check('a').allowed).toBe(true);
  });
});
