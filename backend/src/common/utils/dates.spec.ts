import { addDays, dayLabel, isIsoDate, isMonday, startOfWeek, weekDays } from './dates.js';

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(isIsoDate('2026-10-12')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-10-1')).toBe(false);
    expect(isIsoDate('12/10/2026')).toBe(false);
  });

  it('detects Mondays', () => {
    expect(isMonday('2026-10-12')).toBe(true);
    expect(isMonday('2026-10-13')).toBe(false);
    expect(isMonday('not-a-date')).toBe(false);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('finds the Monday of a week', () => {
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12'); // Sunday
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12');
    expect(startOfWeek('2026-01-01')).toBe('2025-12-29');
  });

  it('lists Mon–Sun with labels', () => {
    const days = weekDays('2026-10-12');
    expect(days).toHaveLength(7);
    expect(days.at(-1)).toBe('2026-10-18');
    expect(days.map(dayLabel)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });
});
