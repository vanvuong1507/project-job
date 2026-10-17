import { parseAppConfig } from '../../../config/app-config.js';
import { LoginAttemptsService, TooManyLoginAttemptsException } from './login-attempts.service.js';

const config = parseAppConfig({
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
  LOGIN_MAX_FAILED_ATTEMPTS: '3',
  LOGIN_LOCKOUT_MINUTES: '15',
});

describe('LoginAttemptsService', () => {
  const t0 = 1_000_000;

  it('locks an email + IP after the maximum failures, with the seconds left', () => {
    const attempts = new LoginAttemptsService(config);
    for (let i = 0; i < 3; i++) {
      attempts.assertAllowed('a@b.co', '1.1.1.1', t0);
      attempts.recordFailure('A@b.co', '1.1.1.1', t0);
    }
    expect(() => attempts.assertAllowed('a@b.co', '1.1.1.1', t0 + 60_000)).toThrow(
      expect.objectContaining({ retryAfterSeconds: 14 * 60 }),
    );
    expect(() => attempts.assertAllowed('a@b.co', '1.1.1.1', t0)).toThrow(
      TooManyLoginAttemptsException,
    );
  });

  it('keeps other emails and IPs unaffected', () => {
    const attempts = new LoginAttemptsService(config);
    for (let i = 0; i < 3; i++) attempts.recordFailure('a@b.co', '1.1.1.1', t0);
    expect(() => attempts.assertAllowed('other@b.co', '1.1.1.1', t0)).not.toThrow();
    expect(() => attempts.assertAllowed('a@b.co', '2.2.2.2', t0)).not.toThrow();
  });

  it('unlocks when the window ends and resets on success', () => {
    const attempts = new LoginAttemptsService(config);
    for (let i = 0; i < 3; i++) attempts.recordFailure('a@b.co', 'ip', t0);
    expect(() => attempts.assertAllowed('a@b.co', 'ip', t0 + 15 * 60_000)).not.toThrow();

    for (let i = 0; i < 2; i++) attempts.recordFailure('c@b.co', 'ip', t0);
    attempts.recordSuccess('c@b.co', 'ip');
    attempts.recordFailure('c@b.co', 'ip', t0);
    expect(() => attempts.assertAllowed('c@b.co', 'ip', t0)).not.toThrow();
  });
});
