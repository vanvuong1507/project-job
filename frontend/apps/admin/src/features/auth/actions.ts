'use server';

import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { redirect as localizedRedirect } from '@/i18n/navigation';
import { fieldErrorsOf, type ActionState } from '@/lib/action-state';
import { safeNextPath } from '@/lib/redirects';
import { loginSchema } from '@/features/auth/schemas';
import { actionErrorFor } from '@/server/action-errors';
import { clientIp } from '@/server/client-ip';
import { loginRateLimiter } from '@/server/rate-limit';
import { signIn, signOut } from '@/server/users';

/**
 * Server Action for the login form (works without JavaScript). Rate-limited per email + IP here, and
 * again by the backend in `DATA_SOURCE=api` mode (its lockout maps to the same message).
 */
export async function loginAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get('email') ?? '');
  // Echo the email back (never the password) so the form keeps it after React's post-action reset.
  const values = { email };

  const parsed = loginSchema.safeParse({ email, password: formData.get('password') });
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'auth.checkFields',
      fieldErrors: fieldErrorsOf(parsed.error),
      values,
    };
  }

  const key = `${parsed.data.email.toLowerCase()}|${await clientIp()}`;
  const limit = loginRateLimiter.check(key);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      status: 'error',
      message: 'auth.tooManyAttempts',
      messageValues: { minutes },
      values,
    };
  }

  let user;
  try {
    user = await signIn(parsed.data.email, parsed.data.password);
  } catch (error) {
    // e.g. the backend's own lockout (LOGIN_LOCKED): same message as the local limiter.
    const state = actionErrorFor(error, {
      forbidden: 'auth.invalidCredentials',
      invalid: 'auth.checkFields',
    });
    if (state) return { ...state, values };
    throw error;
  }
  if (!user) {
    loginRateLimiter.recordFailure(key);
    return { status: 'error', message: 'auth.invalidCredentials', values };
  }

  loginRateLimiter.reset(key);
  redirect(safeNextPath(formData.get('next')));
}

export async function logoutAction(): Promise<void> {
  await signOut();
  localizedRedirect({ href: '/login', locale: await getLocale() });
}
