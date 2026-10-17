/** ISO calendar dates (`YYYY-MM-DD`) handled in UTC, so results never depend on the timezone. */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
export const DAYS_IN_WEEK = 7;

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || toIsoDate(date) !== value ? null : date;
}

export function isIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
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

/** The 7 dates Mon–Sun of the week starting at `weekStart`. */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) => addDays(weekStart, i));
}

/** Today's date in UTC (injectable clock for tests). */
export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now);
}

/** A valid `?weekStart=` value, or the current week's Monday. Invalid input never throws in the UI. */
export function resolveWeekStart(value: unknown, now: Date = new Date()): string {
  if (typeof value === 'string' && isMonday(value)) return value;
  if (typeof value === 'string' && isIsoDate(value)) return startOfWeek(value);
  return startOfWeek(todayIso(now));
}

/*
 * Locale-aware labels via Intl (UTC — these are calendar dates). Intl weekday/day/month output was
 * verified identical in Node and Chromium; ranges are joined by hand because `formatRange` is not
 * (Node's ICU uses U+2009 thin spaces around the dash → hydration mismatch).
 * English uses en-GB conventions ("12 Oct"), matching the reference design.
 */
const intlLocale = (locale: string) => (locale === 'en' ? 'en-GB' : locale);
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(intlLocale(locale), { ...options, timeZone: 'UTC' });
    formatters.set(key, cached);
  }
  return cached;
}

const asDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

/** `Mon` (en) · `Thứ 2` (vi) */
export function dayLabel(isoDate: string, locale = 'en'): string {
  return formatter(locale, { weekday: 'short' }).format(asDate(isoDate));
}

/** `12 Oct` (en) · `12 thg 10` (vi) */
export function formatShortDate(isoDate: string, locale = 'en'): string {
  return formatter(locale, { day: 'numeric', month: 'short' }).format(asDate(isoDate));
}

/** `12 Oct – 18 Oct 2026`; the year is repeated only when the week spans two years. */
export function formatWeekRange(weekStart: string, locale = 'en'): string {
  const end = addDays(weekStart, 6);
  const [startYear, endYear] = [weekStart.slice(0, 4), end.slice(0, 4)];
  const start = formatShortDate(weekStart, locale);
  return startYear === endYear
    ? `${start} – ${formatShortDate(end, locale)} ${endYear}`
    : `${start} ${startYear} – ${formatShortDate(end, locale)} ${endYear}`;
}
