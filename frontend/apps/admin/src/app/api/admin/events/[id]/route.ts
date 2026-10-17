import type { NextRequest } from 'next/server';
import { deleteEvent, updateEvent } from '@/server/events';
import {
  idSchema,
  json,
  noContent,
  parseBody,
  parseParam,
  withPermission,
} from '@/server/http/route-helpers';
import { eventInputSchema } from '@/features/events/schemas';

type Context = RouteContext<'/api/admin/events/[id]'>;

/** Mock of `PUT|DELETE /api/admin/events/:id` (§1.2). */
export const PUT = withPermission(
  'events:write',
  async (request: NextRequest, { params }: Context) => {
    const id = parseParam('id', (await params).id, idSchema);
    return json(await updateEvent(id, await parseBody(request, eventInputSchema)));
  },
);

export const DELETE = withPermission(
  'events:delete',
  async (_request: NextRequest, { params }: Context) => {
    await deleteEvent(parseParam('id', (await params).id, idSchema));
    return noContent();
  },
);
