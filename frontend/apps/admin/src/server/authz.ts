import 'server-only';
import type { AdminUser } from '@frontend/api-client';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { can, type Permission } from '@/lib/permissions';
import { getCurrentUser } from './users';

/**
 * Secure authorization checks (docs: authentication.md → Authorization). Proxy and UI checks are only
 * optimistic — every page, Server Action and Route Handler must call one of these.
 */

/** The signed-in user, or redirect to /login. */
export async function requireUser(): Promise<AdminUser> {
  const user = await getCurrentUser();
  if (!user) return redirect({ href: '/login', locale: await getLocale() });
  return user;
}

/** The signed-in user if they hold `permission`; otherwise redirect (/login or /forbidden). For pages. */
export async function requirePermission(permission: Permission): Promise<AdminUser> {
  const user = await requireUser();
  if (!can(user.role, permission))
    return redirect({ href: '/forbidden', locale: await getLocale() });
  return user;
}

export type AuthorizationResult =
  { ok: true; user: AdminUser } | { ok: false; reason: 'unauthenticated' | 'forbidden' };

/** Non-redirecting variant for Server Actions and Route Handlers (they return 401/403 or an error state). */
export async function authorize(permission: Permission): Promise<AuthorizationResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: 'unauthenticated' };
  if (!can(user.role, permission)) return { ok: false, reason: 'forbidden' };
  return { ok: true, user };
}
