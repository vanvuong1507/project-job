import type { NextRequest } from 'next/server';
import {
  idSchema,
  json,
  noContent,
  parseBody,
  parseParam,
  withPermission,
} from '@/server/http/route-helpers';
import { deleteMetric, updateMetric } from '@/server/metrics';
import { dailyMetricInputSchema } from '@/features/metrics/schemas';

type Context = RouteContext<'/api/admin/daily-metrics/[id]'>;

/** Mock of `PUT|DELETE /api/admin/daily-metrics/:id` (§1.2). */
export const PUT = withPermission(
  'metrics:write',
  async (request: NextRequest, { params }: Context) => {
    const id = parseParam('id', (await params).id, idSchema);
    return json(await updateMetric(id, await parseBody(request, dailyMetricInputSchema)));
  },
);

export const DELETE = withPermission(
  'metrics:write',
  async (_request: NextRequest, { params }: Context) => {
    await deleteMetric(parseParam('id', (await params).id, idSchema));
    return noContent();
  },
);
