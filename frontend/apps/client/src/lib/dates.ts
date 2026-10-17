/** ISO calendar dates (`YYYY-MM-DD`) handled in UTC, so results never depend on the server's timezone. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type DayLabel = (typeof DAY_LABELS)[number];

export function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  // Rejects overflow such as 2026-02-31, which Date silently rolls over.
  return Number.isNaN(date.getTime()) || toIsoDate(date) !== value ? null : date;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  return toIsoDate(new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS));
}

export function isMonday(isoDate: string): boolean {
  return parseIsoDate(isoDate)?.getUTCDay() === 1;
}

/** Monday of the week containing `isoDate`. */
export function startOfWeek(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return addDays(isoDate, -((day + 6) % 7));
}

export function dayLabel(isoDate: string): DayLabel {
  return DAY_LABELS[new Date(`${isoDate}T00:00:00Z`).getUTCDay()]!;
}
