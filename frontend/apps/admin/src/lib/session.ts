/**
 * Session cookie contract shared by the API (mock or real backend) and `proxy.ts`. Edge-safe: no Node
 * imports. Mirrors `backend/src/modules/auth/auth.constants.ts`.
 * - `admin_session`: short-lived access token (JWT `{ sub, role, sid }`), sent to the backend as Bearer.
 * - `admin_refresh`: refresh token, exchanged for a new pair (rotation) by `proxy.ts`.
 * Lifetimes come from the issuer (backend config / mock defaults), not from here.
 */
export const SESSION_COOKIE = 'admin_session';
export const REFRESH_COOKIE = 'admin_refresh';

/** Refresh this long before the access token expires, so no request reaches the API with a dying token. */
export const ACCESS_TOKEN_REFRESH_SKEW_SECONDS = 60;
