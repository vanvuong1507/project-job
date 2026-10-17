import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { env } from '@/env';
import { REFRESH_COOKIE, SESSION_COOKIE } from '@/lib/session';
import { SESSION_COOKIE_NAMES, sessionCookies, type SessionTokens } from './auth/session-cookies';
import { verifySessionToken, type SessionClaims } from './auth/tokens';

/**
 * Session = two httpOnly cookies: a short-lived access token (JWT) and a refresh token. `proxy.ts`
 * refreshes the pair before it expires; Server Actions and Route Handlers set/clear it here.
 * In `DATA_SOURCE=api` mode the backend issues the tokens, so AUTH_SECRET must be its JWT secret.
 */

/** Stores a new session (sign-in). Only Server Actions and Route Handlers may set cookies. */
export async function createSession(tokens: SessionTokens): Promise<void> {
  const store = await cookies();
  for (const { name, value, options } of sessionCookies(tokens)) store.set(name, value, options);
}

export async function deleteSession(): Promise<void> {
  const store = await cookies();
  for (const name of SESSION_COOKIE_NAMES) store.delete(name);
}

/** The raw access token, e.g. to forward as `Authorization: Bearer` to the backend. */
export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

/** Verified access-token claims for this request (memoised with React `cache`), or `null`. */
export const verifySession = cache(async (): Promise<SessionClaims | null> =>
  verifySessionToken(await getSessionToken(), env.AUTH_SECRET),
);
