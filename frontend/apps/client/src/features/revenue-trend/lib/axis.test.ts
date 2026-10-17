import { describe, expect, it } from 'vitest';
import { niceAxis } from './axis';

describe('niceAxis', () => {
  it('reproduces the reference axis for the video data', () => {
    expect(niceAxis(2900)).toEqual({ max: 3000, ticks: [0, 750, 1500, 2250, 3000] });
  });

  it.each([
    [3000, 3000],
    [3001, 4000],
    [1120, 1200],
    [94, 100],
    [0.5, 0.6],
  ])('max %d → axis max %d', (input, expected) => {
    expect(niceAxis(input).max).toBeCloseTo(expected);
  });

  it('falls back to a default range when there is no data', () => {
    expect(niceAxis(0)).toEqual({ max: 1000, ticks: [0, 250, 500, 750, 1000] });
  });
});
