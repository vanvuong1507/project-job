import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Delta } from '../delta';

export interface StatComparison {
  /** Already-formatted previous value, e.g. `"$14,982"`. */
  value: ReactNode;
  /** Percentage change vs. the previous value; `null` hides it. */
  delta?: number | null;
}

export interface StatCardProps extends ComponentProps<'div'> {
  label: ReactNode;
  /** Already-formatted value, e.g. `formatCurrency(15974)`. */
  value: ReactNode;
  comparison?: StatComparison;
  /** Word before the previous value (i18n). */
  comparisonPrefix?: ReactNode;
  /** Locale for the % change (default `en-US`). */
  locale?: string;
}

/** KPI tile: label, headline value and an optional comparison with the previous period. */
export function StatCard({
  label,
  value,
  comparison,
  comparisonPrefix = 'vs',
  locale,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn('flex flex-col gap-1 rounded-tile bg-surface-muted px-4 py-3', className)}
      {...props}
    >
      <p className="text-sm text-foreground">{label}</p>
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-medium text-foreground tabular-nums">{value}</span>
        {comparison && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {comparisonPrefix} {comparison.value}{' '}
            <Delta value={comparison.delta ?? null} parenthesized locale={locale} />
          </span>
        )}
      </p>
    </div>
  );
}
