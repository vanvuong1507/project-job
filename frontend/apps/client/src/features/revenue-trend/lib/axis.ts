/** "Nice" linear axis: equal intervals whose step is 1, 1.5, 2, 2.5, 3, 4, 5 or 7.5 × 10^n (0.75k, 1.5k, 2.25k…). */

const NICE_FACTORS = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10] as const;

export const AXIS_INTERVALS = 4;
const FALLBACK_MAX = 1000;

function niceStep(rawStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const factor = NICE_FACTORS.find((f) => f * magnitude >= rawStep) ?? 10;
  return factor * magnitude;
}

export interface LinearAxis {
  max: number;
  ticks: number[];
}

/** Smallest nice axis that fits `maxValue` in `intervals` equal steps (2,900 → 0…3,000 by 750). */
export function niceAxis(maxValue: number, intervals = AXIS_INTERVALS): LinearAxis {
  const step = maxValue > 0 ? niceStep(maxValue / intervals) : FALLBACK_MAX / intervals;
  return {
    max: step * intervals,
    ticks: Array.from({ length: intervals + 1 }, (_, i) => step * i),
  };
}
