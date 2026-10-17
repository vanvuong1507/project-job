import type { DayEvent, ImpactType } from '@frontend/api-client';

/**
 * One marker per day: the impact most of its events share.
 * A tie counts as NEGATIVE — the safer signal for a manager scanning the week.
 */
export function dominantImpact(events: readonly DayEvent[]): ImpactType | null {
  if (events.length === 0) return null;
  const positives = events.filter((event) => event.impact === 'POSITIVE').length;
  return positives > events.length - positives ? 'POSITIVE' : 'NEGATIVE';
}
