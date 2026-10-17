import type { NextRequest } from 'next/server';
import { json, parseBody, parseParam, withPermission } from '@/server/http/route-helpers';
import { upsertWeek } from '@/server/metrics';
import { weekStartSchema } from '@/lib/validation';
import { weekUpsertSchema } from '@/features/metrics/schemas';

type Context = RouteContext<'/api/admin/weeks/[weekStart]'>;

/** Mock of `PUT /api/admin/weeks/:weekStart` (§1.2): upserts Mon–Sun in one call. */
export const PUT = withPermission(
  'metrics:write',
  async (request: NextRequest, { params }: Context) => {
    const weekStart = parseParam('weekStart', (await params).weekStart, weekStartSchema);
    const { days } = await parseBody(request, weekUpsertSchema);
    return json({ weekStart, days: await upsertWeek(weekStart, days) });
  },
);
