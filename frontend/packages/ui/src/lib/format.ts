/** Locale-aware number formatting. `Intl.NumberFormat` is expensive to construct, so instances are cached. */

export const DEFAULT_LOCALE = 'en-US';

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

interface LocaleOptions {
  locale?: string;
}

/** `15974` → `"$15,974"` (whole units by default). */
export function formatCurrency(
  value: number,
  {
    locale = DEFAULT_LOCALE,
    currency = 'USD',
    maximumFractionDigits = 0,
  }: LocaleOptions & { currency?: string; maximumFractionDigits?: number } = {},
): string {
  return getFormatter(locale, { style: 'currency', currency, maximumFractionDigits }).format(value);
}

/** `871` → `"871"`, `14982.5` → `"14,982.5"`. */
export function formatNumber(
  value: number,
  {
    locale = DEFAULT_LOCALE,
    maximumFractionDigits = 2,
  }: LocaleOptions & { maximumFractionDigits?: number } = {},
): string {
  return getFormatter(locale, { maximumFractionDigits }).format(value);
}

/** Chart-axis style thousands: `0` → `"0k"`, `750` → `"0.75k"`, `2250` → `"2.25k"`, `3000` → `"3k"`. */
export function formatThousands(
  value: number,
  {
    locale = DEFAULT_LOCALE,
    maximumFractionDigits = 2,
  }: LocaleOptions & { maximumFractionDigits?: number } = {},
): string {
  return `${formatNumber(value / 1000, { locale, maximumFractionDigits })}k`;
}

/** `6.6` → `"+6.6%"`, `-2` → `"-2.0%"`, `null` → `null` (no previous value to compare). */
export function formatPercentChange(
  value: number | null,
  { locale = DEFAULT_LOCALE, fractionDigits = 1 }: LocaleOptions & { fractionDigits?: number } = {},
): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  return getFormatter(locale, {
    style: 'percent',
    signDisplay: 'exceptZero',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100);
}

export type Trend = 'positive' | 'negative' | 'neutral';

/** Spec: a change ≥ 0 is good (green), < 0 is bad (red); unknown is neutral. */
export function getTrend(value: number | null): Trend {
  if (value === null || !Number.isFinite(value)) return 'neutral';
  return value >= 0 ? 'positive' : 'negative';
}
