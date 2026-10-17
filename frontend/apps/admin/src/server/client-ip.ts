import 'server-only';
import { headers } from 'next/headers';

/** Best-effort client IP behind a proxy (first `x-forwarded-for` hop), for rate-limit keys only. */
export async function clientIp(): Promise<string> {
  const list = await headers();
  return list.get('x-forwarded-for')?.split(',')[0]?.trim() || list.get('x-real-ip') || 'unknown';
}

/**
 * The incoming `X-Forwarded-For` chain and user agent, forwarded to the backend so its per-IP limits
 * and session audit see the end user, not this server. The backend decides which hops to trust
 * (`TRUST_PROXY` must include this server's address). Empty outside a request scope.
 */
export async function forwardedClient(): Promise<{ forwardedFor?: string; userAgent?: string }> {
  try {
    const list = await headers();
    return {
      forwardedFor: list.get('x-forwarded-for') ?? list.get('x-real-ip') ?? undefined,
      userAgent: list.get('user-agent') ?? undefined,
    };
  } catch {
    return {}; // not in a request scope (e.g. startup)
  }
}
