import {
  created,
  dateRangeFrom,
  list,
  parseBody,
  withPermission,
} from '@/server/http/route-helpers';
import { createMetric, listMetrics } from '@/server/metrics';
import { dailyMetricInputSchema } from '@/features/metrics/schemas';

/** Mock of `GET|POST /api/admin/daily-metrics` (§1.2). */
export const GET = withPermission('metrics:read', async (request) =>
  list(await listMetrics(dateRangeFrom(request))),
);

export const POST = withPermission('metrics:write', async (request) =>
  created(request, await createMetric(await parseBody(request, dailyMetricInputSchema))),
);
