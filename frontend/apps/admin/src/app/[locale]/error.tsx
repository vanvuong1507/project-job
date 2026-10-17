'use client';

import { Button, Card } from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

/** Last-resort boundary inside the locale (e.g. the login page). `retry()` re-fetches server data. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations('common.errors');

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl p-6">
      <Card role="alert">
        <h1 className="text-lg font-semibold">{t('generic')}</h1>
        <Button className="self-start" onClick={retry}>
          {t('retry')}
        </Button>
      </Card>
    </main>
  );
}
