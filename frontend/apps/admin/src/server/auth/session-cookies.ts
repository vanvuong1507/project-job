import { decodeJwt } from 'jose';
import { ACCESS_TOKEN_REFRESH_SKEW_SECONDS, REFRESH_COOKIE, SESSION_COOKIE } from '@/lib/session';

/**
 * Pure session-cookie helpers shared by Server Actions (`cookies()`), Route Handlers and `proxy.ts`
 * (`response.cookies`). No `server-only`/`next/headers` import, so the proxy can use them.
 */

/** A sign-in or refresh result: both tokens and their lifetimes in seconds (cookie Max-Age). */
export interface SessionTokens {
  accessToken: string;
  accessTokenMaxAge: number;
  refreshToken: string;
  refreshTokenMaxAge: number;
}

export interface CookieToSet {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: boolean;
    sameSite: 'lax';
    path: '/';
    maxAge: number;
  };
}

const options = (maxAge: number): CookieToSet['options'] => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge,
});

/** The two httpOnly cookies that hold a session. */
export function sessionCookies(tokens: SessionTokens): CookieToSet[] {
  return [
    { name: SESSION_COOKIE, value: tokens.accessToken, options: options(tokens.accessTokenMaxAge) },
    {
      name: REFRESH_COOKIE,
      value: tokens.refreshToken,
      options: options(tokens.refreshTokenMaxAge),
    },
  ];
}

export const SESSION_COOKIE_NAMES = [SESSION_COOKIE, REFRESH_COOKIE] as const;

/**
 * Whether the access token is missing or expires within the skew. Reads `exp` without verifying the
 * signature: this only decides whether to refresh; every use of the token verifies it.
 */
export function accessTokenNeedsRefresh(token: string | undefined, nowMs = Date.now()): boolean {
  if (!token) return true;
  try {
    const { exp } = decodeJwt(token);
    return typeof exp !== 'number' || exp - ACCESS_TOKEN_REFRESH_SKEW_SECONDS <= nowMs / 1000;
  } catch {
    return true;
  }
}
