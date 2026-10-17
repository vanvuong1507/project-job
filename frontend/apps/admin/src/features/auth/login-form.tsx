'use client';

import { Button, Field, Input } from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { useMessage } from '@/i18n/use-message';
import { fieldErrorFor, IDLE, submittedValue } from '@/lib/action-state';
import { loginAction } from './actions';

/** Posts to a Server Action: validation, rate limiting and the session all happen on the server. */
export function LoginForm({ next }: { next: string }) {
  const t = useTranslations('auth');
  const message = useMessage();
  const [state, formAction, pending] = useActionState(loginAction, IDLE);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      {state.status === 'error' && (
        <p
          role="alert"
          className="rounded-control bg-negative-soft px-3 py-2 text-sm text-negative"
        >
          {message(state.message, state.messageValues)}
        </p>
      )}
      <Field label={t('email')} error={message(fieldErrorFor(state, 'email'))} required>
        {(control) => (
          <Input
            {...control}
            name="email"
            type="email"
            autoComplete="username"
            defaultValue={submittedValue(state, 'email')}
            required
          />
        )}
      </Field>
      <Field label={t('password')} error={message(fieldErrorFor(state, 'password'))} required>
        {(control) => (
          <Input
            {...control}
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        )}
      </Field>
      <Button type="submit" loading={pending} className="mt-2">
        {t('submit')}
      </Button>
    </form>
  );
}
