import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/exceptions/error-codes.js';
import { TooManyRequestsException } from '../../../common/exceptions/too-many-requests.exception.js';
import { APP_CONFIG, type AppConfig } from '../../../config/app-config.js';

interface Window {
  failures: number;
  resetAt: number;
}

/** 429 + `Retry-After` while an email + IP pair is locked out. */
export class TooManyLoginAttemptsException extends TooManyRequestsException {
  constructor(retryAfterSeconds: number) {
    super(
      ErrorCode.LOGIN_LOCKED,
      'Too many login attempts. Please try again later.',
      retryAfterSeconds,
    );
  }
}

/**
 * Brute-force protection: after LOGIN_MAX_FAILED_ATTEMPTS failures for one email + IP within
 * LOGIN_LOCKOUT_MINUTES, further logins for that pair are refused until the window ends. A success
 * clears the counter. In-memory (single instance); swap for Redis when running several replicas.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly windows = new Map<string, Window>();
  private readonly maxFailures: number;
  private readonly windowMs: number;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.maxFailures = config.auth.maxFailedLogins;
    this.windowMs = config.auth.lockoutMs;
  }

  /** Throws `TooManyLoginAttemptsException` while the pair is locked out. */
  assertAllowed(email: string, ip: string, now = Date.now()): void {
    const window = this.current(email, ip, now);
    if (window && window.failures >= this.maxFailures) {
      throw new TooManyLoginAttemptsException(Math.ceil((window.resetAt - now) / 1000));
    }
  }

  recordFailure(email: string, ip: string, now = Date.now()): void {
    const key = keyOf(email, ip);
    const window = this.current(email, ip, now) ?? { failures: 0, resetAt: now + this.windowMs };
    window.failures++;
    this.windows.set(key, window);
    if (this.windows.size > 10_000) this.prune(now);
  }

  recordSuccess(email: string, ip: string): void {
    this.windows.delete(keyOf(email, ip));
  }

  private current(email: string, ip: string, now: number): Window | undefined {
    const key = keyOf(email, ip);
    const window = this.windows.get(key);
    if (window && window.resetAt <= now) {
      this.windows.delete(key);
      return undefined;
    }
    return window;
  }

  private prune(now: number): void {
    for (const [key, window] of this.windows) if (window.resetAt <= now) this.windows.delete(key);
  }
}

const keyOf = (email: string, ip: string) => `${email.toLowerCase()}|${ip}`;
