/**
 * Cookie contract shared with the admin app (`apps/admin/src/lib/session.ts`). Keep in sync.
 * `admin_session`: the short-lived access token (JWT), sent on every API call.
 * `admin_refresh`: the refresh token, only sent to /api/auth (refresh, logout).
 * Lifetimes come from the config (ACCESS_TOKEN_TTL_MINUTES, REFRESH_TOKEN_TTL_DAYS).
 */
export const SESSION_COOKIE = 'admin_session';
export const REFRESH_COOKIE = 'admin_refresh';
export const REFRESH_COOKIE_PATH = '/api/auth';

/** OpenAPI security scheme names (registered in bootstrap/swagger.ts). */
export const COOKIE_AUTH = 'session-cookie';
export const BEARER_AUTH = 'bearer';
