import { describe, expect, it } from 'vitest';
import { addDays, dayLabel, isMonday, parseIsoDate, startOfWeek } from './dates';

describe('dates', () => {
  it('parses only real calendar dates', () => {
    expect(parseIsoDate('2026-10-12')).toEqual(new Date('2026-10-12T00:00:00Z'));
    expect(parseIsoDate('2026-02-31')).toBeNull();
    expect(parseIsoDate('12/10/2026')).toBeNull();
  });

  it('does week math in UTC', () => {
    expect(addDays('2026-10-12', -7)).toBe('2026-10-05');
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04');
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12');
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12');
    expect(isMonday('2026-10-12')).toBe(true);
    expect(isMonday('2026-10-13')).toBe(false);
    expect(dayLabel('2026-10-17')).toBe('Sat');
  });
});
