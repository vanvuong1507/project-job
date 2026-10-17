import type { ApiErrorBody, ErrorCode } from '@frontend/api-client';
import type { NextRequest } from 'next/server';
import { env } from '@/env';
import { InvalidWeekStartError, parseWeekStart } from '@/features/revenue-trend/lib/week-start';
import { getRevenueTrend } from '@/server/revenue-trend';

/**
 * Mock of the backend endpoint `GET /api/dashboard/revenue-trend` (docs/US-TASK-DETAIL.md §1.2),
 * for browsers and tools. Pages don't use it — they read through the DAL directly.
 * Disabled (404) unless ENABLE_MOCK_API=true. Errors use the backend's body (backend/docs/API.md).
 */

const VALID_REQUEST_ID = /^[\w-]{1,128}$/;

export async function GET(request: NextRequest) {
  const incoming = request.headers.get('x-request-id');
  const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-Id': requestId };

  const fail = (
    status: number,
    code: ErrorCode,
    error: string,
    details?: ApiErrorBody['details'],
  ) =>
    Response.json(
      {
        statusCode: status,
        code,
        error,
        ...(details ? { details } : {}),
        requestId,
        path: request.nextUrl.pathname,
        timestamp: new Date().toISOString(),
      } satisfies ApiErrorBody,
      { status, headers },
    );

  if (!env.ENABLE_MOCK_API) return fail(404, 'ROUTE_NOT_FOUND', 'Not found');

  try {
    const weekStart = parseWeekStart(request.nextUrl.searchParams.get('weekStart'));
    return Response.json(await getRevenueTrend(weekStart), { headers });
  } catch (error) {
    if (error instanceof InvalidWeekStartError)
      return fail(400, 'VALIDATION_FAILED', 'Validation failed', { weekStart: [error.message] });
    throw error;
  }
}
