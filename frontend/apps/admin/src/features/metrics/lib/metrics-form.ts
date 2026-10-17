import type { DailyMetric } from '@frontend/api-client';
import { formatCurrency } from '@frontend/ui';
import { dayMetricsSchema, type DayMetricsInput } from '../schemas';

/** Pure helpers for the weekly metrics editor (shared by the client form and the Server Action). */

/** Labels live in the catalogs under `metrics.fields.<key>`. */
export const FIELDS = [
  { key: 'posRevenue', step: '0.01' },
  { key: 'eatclubRevenue', step: '0.01' },
  { key: 'labourCost', step: '0.01' },
  { key: 'covers', step: '1' },
] as const satisfies ReadonlyArray<{ key: keyof DayMetricsInput; step: string }>;

export type FieldKey = (typeof FIELDS)[number]['key'];
/** One day as typed in the inputs (strings until validated). */
export type Row = Record<FieldKey, string>;
/** Keys like `3.covers` (row index . field). */
export type CellErrors = Record<string, string>;

/** `name` of an input, read back by the Server Action from FormData. */
export const inputName = (index: number, key: FieldKey) => `days.${index}.${key}`;

export const toRow = (metric?: DailyMetric): Row => ({
  posRevenue: String(metric?.posRevenue ?? 0),
  eatclubRevenue: String(metric?.eatclubRevenue ?? 0),
  labourCost: String(metric?.labourCost ?? 0),
  covers: String(metric?.covers ?? 0),
});

/** '' → NaN so the schema reports "Enter a number" instead of treating blanks as 0. */
export const toNumbers = (row: Row): Record<FieldKey, number> =>
  Object.fromEntries(
    FIELDS.map(({ key }) => [key, row[key].trim() === '' ? Number.NaN : Number(row[key])]),
  ) as Record<FieldKey, number>;

export function validateRows(rows: readonly Row[]): CellErrors {
  const errors: CellErrors = {};
  rows.forEach((row, index) => {
    const result = dayMetricsSchema.safeParse(toNumbers(row));
    if (result.success) return;
    for (const issue of result.error.issues)
      errors[`${index}.${String(issue.path[0])}`] ??= issue.message;
  });
  return errors;
}

/** Rebuilds the 7 rows from submitted FormData (`days.<i>.<field>`). */
export function rowsFromFormData(formData: FormData, days = 7): Row[] {
  return Array.from(
    { length: days },
    (_, index) =>
      Object.fromEntries(
        FIELDS.map(({ key }) => [key, String(formData.get(inputName(index, key)) ?? '')]),
      ) as Row,
  );
}

/** A cell's value for live totals; empty, invalid or negative input counts as 0 (per cell, not per row). */
const validAmount = (value: string) => {
  const number = Number(value);
  return value.trim() !== '' && Number.isFinite(number) && number >= 0 ? number : 0;
};

export function weekTotals(rows: readonly Row[]) {
  const sum = (...keys: FieldKey[]) =>
    rows.reduce(
      (total, row) => total + keys.reduce((acc, key) => acc + validAmount(row[key]), 0),
      0,
    );
  return {
    revenue: sum('posRevenue', 'eatclubRevenue'),
    labour: sum('labourCost'),
    covers: sum('covers'),
  };
}

/** Whole amounts without decimals (`$15,974`), otherwise cents (`$15,974.50`). */
export const formatMoney = (value: number, locale?: string) =>
  formatCurrency(value, { locale, maximumFractionDigits: Number.isInteger(value) ? 0 : 2 });

/** Same value per cell, numerically when both are numbers ("1234.50" equals "1234.5"). */
export function sameRows(a: readonly Row[], b: readonly Row[]): boolean {
  const same = (x: string, y: string) =>
    x.trim() === y.trim() || (x.trim() !== '' && y.trim() !== '' && Number(x) === Number(y));
  return (
    a.length === b.length &&
    a.every((row, i) => FIELDS.every(({ key }) => same(row[key], b[i]![key])))
  );
}
