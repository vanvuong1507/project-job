/**
 * ISO calendar dates (`YYYY-MM-DD`) handled as plain strings in UTC, so results never depend on the
 * server's timezone. Postgres `date` columns are read back as the same strings (see database/utils/pg-types.ts).
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type DayLabel = (typeof DAY_LABELS)[number];

export const DAYS_IN_WEEK = 7;

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `true` only for real calendar dates in `YYYY-MM-DD` form (rejects `2026-02-30`). */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && toIsoDate(date) === value;
}

export function addDays(isoDate: string, days: number): string {
  return toIsoDate(new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS));
}

export function isMonday(isoDate: string): boolean {
  return isIsoDate(isoDate) && new Date(`${isoDate}T00:00:00Z`).getUTCDay() === 1;
}

/** Monday of the week containing `isoDate`. */
export function startOfWeek(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return addDays(isoDate, -((day + 6) % 7));
}

/** The 7 dates Mon–Sun of the week starting at `weekStart`. */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDays(weekStart, i));
}

/** `Mon` … `Sun` */
export function dayLabel(isoDate: string): DayLabel {
  return DAY_LABELS[new Date(`${isoDate}T00:00:00Z`).getUTCDay()]!;
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now);
}
