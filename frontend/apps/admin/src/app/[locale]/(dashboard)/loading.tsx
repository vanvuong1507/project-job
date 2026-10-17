import { Skeleton } from '@frontend/ui';
import { getTranslations } from 'next-intl/server';

export default async function Loading() {
  const t = await getTranslations('shell');
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label={t('loading')}>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-80 rounded-tile" />
    </div>
  );
}
