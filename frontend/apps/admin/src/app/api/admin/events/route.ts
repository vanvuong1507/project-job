import {
  created,
  dateRangeFrom,
  list,
  parseBody,
  withPermission,
} from '@/server/http/route-helpers';
import { createEvent, listEvents } from '@/server/events';
import { eventInputSchema } from '@/features/events/schemas';

/** Mock of `GET|POST /api/admin/events` (§1.2). */
export const GET = withPermission('events:read', async (request) =>
  list(await listEvents(dateRangeFrom(request))),
);

export const POST = withPermission('events:write', async (request) =>
  created(request, await createEvent(await parseBody(request, eventInputSchema))),
);
