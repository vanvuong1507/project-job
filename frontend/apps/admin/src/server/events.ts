import 'server-only';
import type { EventImpact } from '@frontend/api-client';
import { addDays } from '@/lib/week';
import type { EventData } from '@/features/events/schemas';
import { repositories } from './data-source';
import type { DateRange } from './repositories';

/** Event impacts DAL. Authorization is enforced by callers (pages, actions, handlers) via `server/authz`. */

export const listEvents = (range: DateRange): Promise<EventImpact[]> =>
  repositories.events.list(range);

export const listWeekEvents = (weekStart: string): Promise<EventImpact[]> =>
  repositories.events.list({ from: weekStart, to: addDays(weekStart, 6) });

export const createEvent = (input: EventData) => repositories.events.create(input);
export const updateEvent = (id: string, input: EventData) => repositories.events.update(id, input);
export const deleteEvent = (id: string) => repositories.events.remove(id);
