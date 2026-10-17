import { getTranslations } from 'next-intl/server';
import { env } from '@/env';
import { WeeklyMetricsForm } from '@/features/metrics/components/weekly-metrics-form';
import { can } from '@/lib/permissions';
import { resolveWeekStart } from '@/lib/week';
import { requirePermission } from '@/server/authz';
import { listWeekMetrics } from '@/server/metrics';

export async function generateMetadata() {
  const t = await getTranslations('metrics');
  return { title: t('title') };
}

export default async function WeeklyDataPage({ searchParams }: PageProps<'/[locale]'>) {
  const [user, t] = await Promise.all([
    requirePermission('metrics:read'),
    getTranslations('metrics'),
  ]);
  const weekStart = resolveWeekStart((await searchParams).weekStart);
  const metrics = await listWeekMetrics(weekStart);

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>
      {/* key: a new week starts from fresh form state */}
      <WeeklyMetricsForm
        key={weekStart}
        weekStart={weekStart}
        metrics={metrics}
        dashboardUrl={env.NEXT_PUBLIC_CLIENT_URL}
        readOnly={!can(user.role, 'metrics:write')}
      />
    </section>
  );
}
