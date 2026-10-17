import type { ComponentProps } from 'react';
import { formatPercentChange, getTrend } from '../../lib/format';
import { cn } from '../../lib/cn';

const TREND_CLASSES = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-muted-foreground',
} as const;

export interface DeltaProps extends Omit<ComponentProps<'span'>, 'children'> {
  /** Percentage change, e.g. `6.6` for +6.6%. `null` renders nothing. */
  value: number | null;
  /** Wrap in parentheses: `(+6.6%)`. */
  parenthesized?: boolean;
  fractionDigits?: number;
  /** BCP 47 locale for the number format (default `en-US`). */
  locale?: string;
}

/** Signed, colour-coded percentage change. */
export function Delta({
  value,
  parenthesized = false,
  fractionDigits,
  locale,
  className,
  ...props
}: DeltaProps) {
  const text = formatPercentChange(value, { fractionDigits, locale });
  if (text === null) return null;

  return (
    <span
      className={cn('font-semibold tabular-nums', TREND_CLASSES[getTrend(value)], className)}
      {...props}
    >
      {parenthesized ? `(${text})` : text}
    </span>
  );
}
