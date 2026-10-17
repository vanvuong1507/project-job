import type { NextRequest } from 'next/server';
import { clientIp } from '@/server/client-ip';
import { TooManyAttemptsError, UnauthorizedError } from '@/server/errors';
import { handle, json, parseBody } from '@/server/http/route-helpers';
import { loginRateLimiter } from '@/server/rate-limit';
import { signIn } from '@/server/users';
import { loginSchema } from '@/features/auth/schemas';

/** Mock of `POST /api/auth/login` (§1.2): sets the httpOnly session cookie. */
export const POST = handle(async (request: NextRequest) => {
  const { email, password } = await parseBody(request, loginSchema);
  const key = `${email.toLowerCase()}|${await clientIp()}`;
  const limit = loginRateLimiter.check(key);
  if (!limit.allowed) throw new TooManyAttemptsError(limit.retryAfterSeconds);

  const user = await signIn(email, password);
  if (!user) {
    loginRateLimiter.recordFailure(key);
    throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
  }
  loginRateLimiter.reset(key);
  return json({ user });
});
