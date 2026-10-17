import { buttonClasses } from '@frontend/ui';
import { getTranslations } from 'next-intl/server';
import { RevenueTrendCard } from '@/features/revenue-trend/components/revenue-trend-card';
import { RevenueTrendMessage } from '@/features/revenue-trend/components/revenue-trend-message';
import { InvalidWeekStartError, parseWeekStart } from '@/features/revenue-trend/lib/week-start';
import { Link } from '@/i18n/navigation';
import { getRevenueTrend, isEmptyTrend } from '@/server/revenue-trend';

export default async function DashboardPage({ searchParams }: PageProps<'/[locale]'>) {
  const t = await getTranslations('dashboard');
  const { weekStart: rawWeekStart } = await searchParams;

  // Validate input at the boundary, before any data access.
  let weekStart: string | undefined;
  try {
    weekStart = parseWeekStart(typeof rawWeekStart === 'string' ? rawWeekStart : undefined);
  } catch (error) {
    if (!(error instanceof InvalidWeekStartError)) throw error;
    return (
      <Main>
        <RevenueTrendMessage
          role="alert"
          title={t('invalidWeek.title')}
          description={t('invalidWeek.description')}
          action={
            <Link href="/" className={buttonClasses({ variant: 'outline' })}>
              {t('invalidWeek.action')}
            </Link>
          }
        />
      </Main>
    );
  }

  const trend = await getRevenueTrend(weekStart);

  if (isEmptyTrend(trend)) {
    return (
      <Main>
        <RevenueTrendMessage
          title={t('empty.title')}
          description={t('empty.description', { start: trend.week.start, end: trend.week.end })}
        />
      </Main>
    );
  }

  return (
    <Main>
      <RevenueTrendCard trend={trend} />
    </Main>
  );
}

function Main({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">{children}</main>;
}
