'use client';

import { Button, Card } from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

/** Unexpected failures inside the authenticated area. `retry()` re-fetches server data (Next 16.3+). */
export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card role="alert">
      <h1 className="text-lg font-semibold">{t('pageError.title')}</h1>
      <p className="text-sm text-muted-foreground">{t('pageError.description')}</p>
      <Button className="self-start" onClick={retry}>
        {t('common.errors.retry')}
      </Button>
    </Card>
  );
}
