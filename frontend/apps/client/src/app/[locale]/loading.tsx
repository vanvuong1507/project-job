import { getTranslations } from 'next-intl/server';
import { RevenueTrendSkeleton } from '@/features/revenue-trend/components/revenue-trend-skeleton';

export default async function Loading() {
  const t = await getTranslations('dashboard');
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
      <RevenueTrendSkeleton label={t('loading')} />
    </main>
  );
}
