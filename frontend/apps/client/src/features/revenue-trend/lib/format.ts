/** Locale-aware labels for chart axes and tooltips (dates are calendar dates → formatted in UTC). */
export function weekdayLabel(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}
