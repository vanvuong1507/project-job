'use client';

import { Button } from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { RevenueTrendMessage } from '@/features/revenue-trend/components/revenue-trend-message';

/** Unexpected failures (API down, timeout). `retry()` re-fetches the server data, unlike `reset()`. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <RevenueTrendMessage
        role="alert"
        title={t('dashboard.error.title')}
        description={t('dashboard.error.description')}
        action={<Button onClick={retry}>{t('common.errors.retry')}</Button>}
      />
    </main>
  );
}
