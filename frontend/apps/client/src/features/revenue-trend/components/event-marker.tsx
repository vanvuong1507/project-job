'use client';

import type { DayEvent } from '@frontend/api-client';
import { IconBadge, Tooltip, TrendingDownIcon, TrendingUpIcon } from '@frontend/ui';
import { useTranslations } from 'next-intl';
import { dominantImpact } from '../lib/events';

export interface EventMarkerProps {
  /** Localized weekday, used in the accessible name. */
  day: string;
  events: DayEvent[];
}

/** Round impact icon above a day's bars; hover or focus lists every event of that day. */
export function EventMarker({ day, events }: EventMarkerProps) {
  const t = useTranslations('dashboard.event');
  const impact = dominantImpact(events);
  if (!impact) return null;

  const positive = impact === 'POSITIVE';

  return (
    <Tooltip
      // Below the icon: the chart may be a horizontal scroll container on mobile, which would clip above.
      side="bottom"
      content={
        <ul className="space-y-1.5">
          {events.map((event) => (
            <li key={`${event.impact}-${event.title}`}>
              <strong className="block font-medium">{event.title}</strong>
              {event.description && <span className="opacity-80">{event.description}</span>}
            </li>
          ))}
        </ul>
      }
    >
      {(triggerProps) => (
        <button
          type="button"
          aria-label={t(positive ? 'positive' : 'negative', { day })}
          className="rounded-full"
          {...triggerProps}
        >
          <IconBadge tone={positive ? 'positive' : 'negative'}>
            {positive ? <TrendingUpIcon /> : <TrendingDownIcon />}
          </IconBadge>
        </button>
      )}
    </Tooltip>
  );
}
