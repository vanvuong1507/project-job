import 'server-only';
import type { AdminUser } from '@frontend/api-client';
import { cache } from 'react';
import { repositories } from './data-source';
import {
  createSession,
  deleteSession,
  getRefreshToken,
  getSessionToken,
  verifySession,
} from './session';

/** Signed-in user for this request (memoised), or `null` without a valid, active session. */
export const getCurrentUser = cache(async (): Promise<AdminUser | null> => {
  const session = await verifySession();
  return session ? repositories.auth.currentUser(session) : null;
});

/** Verifies credentials and starts a session. Returns the user, or `null` for invalid credentials. */
export async function signIn(email: string, password: string): Promise<AdminUser | null> {
  const result = await repositories.auth.login(email, password);
  if (!result) return null;
  await createSession(result.tokens);
  return result.user;
}

/**
 * Revokes the session (its tokens stop working everywhere at once), then clears the cookies.
 * The cookies are cleared even if revoking fails (e.g. the backend is down).
 */
export async function signOut(): Promise<void> {
  try {
    await repositories.auth.logout({
      refreshToken: await getRefreshToken(),
      accessToken: await getSessionToken(),
    });
  } finally {
    await deleteSession();
  }
}
