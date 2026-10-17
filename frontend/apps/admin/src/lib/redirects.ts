import type { Route } from 'next';

/**
 * Only same-app relative paths are allowed as post-login targets (no open redirects).
 * Unknown paths still resolve to the app's 404, so treating the result as a `Route` is safe.
 */
export function safeNextPath(value: unknown, fallback = '/'): Route {
  const path =
    typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
      ? value
      : fallback;
  return path as Route;
}
