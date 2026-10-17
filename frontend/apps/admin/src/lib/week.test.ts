import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayLabel,
  formatShortDate,
  formatWeekRange,
  isMonday,
  parseIsoDate,
  resolveWeekStart,
  startOfWeek,
  weekDays,
} from './week';

describe('week', () => {
  it('parses only real dates', () => {
    expect(parseIsoDate('2026-10-12')).not.toBeNull();
    expect(parseIsoDate('2026-02-30')).toBeNull();
    expect(parseIsoDate('2026-10-12T00:00')).toBeNull();
  });

  it('does Monday-based week math in UTC', () => {
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12');
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(isMonday('2026-10-12')).toBe(true);
    expect(weekDays('2026-10-12')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ]);
  });

  it('resolves ?weekStart= safely', () => {
    const now = new Date('2026-10-16T10:00:00Z');
    expect(resolveWeekStart('2026-10-05', now)).toBe('2026-10-05');
    expect(resolveWeekStart('2026-10-08', now)).toBe('2026-10-05'); // snaps to Monday
    expect(resolveWeekStart('garbage', now)).toBe('2026-10-12');
    expect(resolveWeekStart(undefined, now)).toBe('2026-10-12');
  });

  it('formats labels per locale', () => {
    expect(dayLabel('2026-10-18')).toBe('Sun');
    expect(formatShortDate('2026-10-05')).toBe('5 Oct');
    expect(formatWeekRange('2026-10-12')).toBe('12 Oct – 18 Oct 2026');
    expect(formatWeekRange('2025-12-29')).toBe('29 Dec 2025 – 4 Jan 2026');
    expect(formatShortDate('2026-10-12', 'vi')).toBe('12 thg 10');
    expect(dayLabel('2026-10-12', 'vi')).toBe('Thứ 2');
  });
});
