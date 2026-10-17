import type { RevenueTrendResponse } from '@frontend/api-client';
import { formatCurrency, formatNumber, StatCard } from '@frontend/ui';
import { useLocale, useTranslations } from 'next-intl';

const KPIS = [
  { key: 'totalRevenue', format: formatCurrency },
  { key: 'averagePerDay', format: formatCurrency },
  { key: 'totalCovers', format: formatNumber },
] as const satisfies ReadonlyArray<{
  key: keyof RevenueTrendResponse['summary'];
  format: (value: number, options?: { locale?: string }) => string;
}>;

export interface KpiSummaryProps {
  summary: RevenueTrendResponse['summary'];
  /** Show the previous-period value and % change. */
  compare: boolean;
}

/** The three headline KPIs. Values come straight from the API `summary`; nothing is recomputed here. */
export function KpiSummary({ summary, compare }: KpiSummaryProps) {
  const t = useTranslations('dashboard.kpi');
  const locale = useLocale();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {KPIS.map(({ key, format }) => {
        const value = summary[key];
        return (
          <StatCard
            key={key}
            label={t(key)}
            value={format(value.current, { locale })}
            locale={locale}
            comparisonPrefix={t('vs')}
            comparison={
              compare
                ? { value: format(value.previous, { locale }), delta: value.changePct }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
