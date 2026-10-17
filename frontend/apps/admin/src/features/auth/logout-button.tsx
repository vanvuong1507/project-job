'use client';

import { Button } from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { useFormStatus } from 'react-dom';
import { logoutAction } from './actions';

function SubmitButton() {
  const t = useTranslations('shell');
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" loading={pending}>
      {t('logout')}
    </Button>
  );
}

/** A form posting to the logout Server Action (works without JavaScript). */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <SubmitButton />
    </form>
  );
}
