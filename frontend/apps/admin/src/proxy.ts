import { DEFAULT_LOCALE, isLocale, type Locale } from '@frontend/i18n';
import { decodeJwt } from 'jose';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { can, isRole, permissionForPath } from '@/lib/permissions';
import { REFRESH_COOKIE, SESSION_COOKIE } from '@/lib/session';
import {
  accessTokenNeedsRefresh,
  SESSION_COOKIE_NAMES,
  sessionCookies,
  type SessionTokens,
} from '@/server/auth/session-cookies';
import { repositories } from '@/server/data-source';
import { UnauthorizedError } from '@/server/errors';
import { logger } from '@/server/logger';

const intl = createIntlMiddleware(routing);

/**
 * 1. Session refresh: when the access token is missing or about to expire and a refresh token exists,
 *    exchange it (rotation) BEFORE anything renders — Server Components can't set cookies, so this is
 *    the one place that can. The new cookies go to the browser (Set-Cookie) and to this very request
 *    (pages and Server Actions read the fresh token). A rejected refresh token ends the session.
 * 2. Optimistic auth (docs: authentication.md → Proxy) on the locale-less path — cookie only:
 *    no session → /login?next=…, a role without the route's permission → /forbidden (both localized).
 *    Pages, Server Actions and Route Handlers re-check securely through `server/authz`.
 * 3. next-intl locale negotiation and prefixes (`/vi/...`); it forwards the (refreshed) request headers.
 * `/login` is never redirected here (a stale cookie would loop) — the page checks the session itself.
 */
export async function proxy(request: NextRequest) {
  const refresh = await refreshSession(request);
  return withSessionCookies(route(request), refresh);
}

function route(request: NextRequest): NextResponse {
  const { locale, path } = splitLocale(request.nextUrl.pathname);
  if (path === '/login') return intl(request);

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const login = new URL(localized('/login', locale), request.url);
    login.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  const permission = permissionForPath(path);
  if (permission && !can(roleFrom(token), permission)) {
    return NextResponse.redirect(new URL(localized('/forbidden', locale), request.url));
  }
  return intl(request);
}

type RefreshOutcome =
  { status: 'unchanged' } | { status: 'refreshed'; tokens: SessionTokens } | { status: 'ended' };

/** Refreshes the session if needed and updates the request's cookies accordingly. */
async function refreshSession(request: NextRequest): Promise<RefreshOutcome> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken || !accessTokenNeedsRefresh(request.cookies.get(SESSION_COOKIE)?.value)) {
    return { status: 'unchanged' };
  }

  try {
    const { tokens } = await repositories.auth.refresh(refreshToken, {
      forwardedFor: request.headers.get('x-forwarded-for') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
    });
    for (const { name, value } of sessionCookies(tokens)) request.cookies.set(name, value);
    return { status: 'refreshed', tokens };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      // Invalid, expired or replayed (REFRESH_TOKEN_REUSED revokes the session): sign in again.
      logger.info('session ended at refresh', { code: error.code, path: request.nextUrl.pathname });
      for (const name of SESSION_COOKIE_NAMES) request.cookies.delete(name);
      return { status: 'ended' };
    }
    // Backend unreachable etc.: keep the cookies and let the page report it; retried next request.
    logger.error('session refresh failed', { error, path: request.nextUrl.pathname });
    return { status: 'unchanged' };
  }
}

function withSessionCookies(response: NextResponse, refresh: RefreshOutcome): NextResponse {
  if (refresh.status === 'refreshed') {
    for (const { name, value, options } of sessionCookies(refresh.tokens))
      response.cookies.set(name, value, options);
  } else if (refresh.status === 'ended') {
    for (const name of SESSION_COOKIE_NAMES) response.cookies.delete(name);
  }
  return response;
}

function splitLocale(pathname: string): { locale: Locale; path: string } {
  const [, first, ...rest] = pathname.split('/');
  return isLocale(first)
    ? { locale: first, path: `/${rest.join('/')}` }
    : { locale: DEFAULT_LOCALE, path: pathname };
}

const localized = (path: string, locale: Locale) =>
  locale === DEFAULT_LOCALE ? path : `/${locale}${path}`;

/** Role claim without verifying the signature (optimistic); an unreadable token defers to the page check. */
function roleFrom(token: string) {
  try {
    const { role } = decodeJwt(token);
    return isRole(role) ? role : undefined;
  } catch {
    return undefined;
  }
}

export const config = {
  // Everything except API routes, Next internals, Vercel internals and files with an extension.
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};
