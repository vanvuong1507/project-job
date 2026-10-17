import type { DayEvent } from '@frontend/api-client';
import { describe, expect, it } from 'vitest';
import { dominantImpact } from './events';

const positive: DayEvent = { impact: 'POSITIVE', title: 'Festival' };
const negative: DayEvent = { impact: 'NEGATIVE', title: 'Rain' };

describe('dominantImpact', () => {
  it('returns null without events', () => {
    expect(dominantImpact([])).toBeNull();
  });

  it('picks the majority impact', () => {
    expect(dominantImpact([positive])).toBe('POSITIVE');
    expect(dominantImpact([positive, positive, negative])).toBe('POSITIVE');
    expect(dominantImpact([negative, negative, positive])).toBe('NEGATIVE');
  });

  it('treats a tie as negative', () => {
    expect(dominantImpact([positive, negative])).toBe('NEGATIVE');
  });
});
