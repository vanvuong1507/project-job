import { isMonday, parseIsoDate } from '@/lib/dates';

export class InvalidWeekStartError extends Error {
  override readonly name = 'InvalidWeekStartError';

  constructor(readonly value: string) {
    super('weekStart must be a Monday in YYYY-MM-DD format');
  }
}

/** Validates `?weekStart=`; `undefined` means "latest week with data". */
export function parseWeekStart(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (!parseIsoDate(value) || !isMonday(value)) throw new InvalidWeekStartError(value);
  return value;
}
