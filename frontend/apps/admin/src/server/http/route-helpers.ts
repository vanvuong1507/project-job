import 'server-only';
import type { AdminUser, ApiErrorBody, ErrorCode } from '@frontend/api-client';
import type { NextRequest } from 'next/server';
import { ZodError, z } from 'zod';
import { env } from '@/env';
import { isoDateSchema } from '@/lib/validation';
import type { Permission } from '@/lib/permissions';
import { authorize } from '../authz';
import { DomainError, ForbiddenError, UnauthorizedError, ValidationError } from '../errors';
import type { DateRange } from '../repositories';

/**
 * Plumbing for the mock JSON API (src/app/api), which mirrors the backend contract
 * (backend/docs/API.md): bare resources on success, `X-Total-Count` on lists, `201` + `Location` on
 * create, and on failure the same error body `{ statusCode, code, error, details?, requestId, path, timestamp }`.
 */

const NO_STORE = { 'Cache-Control': 'no-store' };
const REQUEST_ID = 'x-request-id';
const VALID_REQUEST_ID = /^[\w-]{1,128}$/;

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, { ...init, headers: { ...NO_STORE, ...init.headers } });
}

/** A collection, with its size in `X-Total-Count` (like the backend). */
export function list(items: readonly unknown[]) {
  return json(items, { headers: { 'X-Total-Count': String(items.length) } });
}

/** `201` with `Location: <collection>/<id>`. */
export function created(request: NextRequest, resource: { id: string }) {
  return json(resource, {
    status: 201,
    headers: { Location: `${request.nextUrl.pathname}/${resource.id}` },
  });
}

export function noContent() {
  return new Response(null, { status: 204, headers: NO_STORE });
}

/** Thrown for malformed requests that are not a schema failure (e.g. invalid JSON). */
class BadRequestError extends DomainError {
  readonly status = 400;
  readonly code = 'INVALID_JSON';
}

interface ErrorExtra {
  details?: unknown;
  headers?: HeadersInit;
}

function errorResponse(
  request: Request,
  requestId: string,
  status: number,
  code: ErrorCode,
  error: string,
  { details, headers }: ErrorExtra = {},
) {
  const body: ApiErrorBody = {
    statusCode: status,
    code,
    error,
    ...(details === undefined ? {} : { details: details as ApiErrorBody['details'] }),
    requestId,
    path: new URL(request.url).pathname,
    timestamp: new Date().toISOString(),
  };
  return json(body, { status, headers });
}

/** `{ "days.0.covers": ["Must be a whole number"] }` — dotted paths so nested form fields can be mapped. */
export function fieldErrors(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues)
    (result[issue.path.join('.') || '_'] ??= []).push(issue.message);
  return result;
}

export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequestError('Request body must be valid JSON');
  }
  return schema.parse(body);
}

/** Validates a path/query value, reporting issues under `field`. */
export function parseParam<S extends z.ZodType>(
  field: string,
  value: unknown,
  schema: S,
): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ZodError(result.error.issues.map((issue) => ({ ...issue, path: [field] })));
  return result.data;
}

/** Resource ids are UUIDs, as in the backend (a malformed id is a `400`, an unknown one a `404`). */
export const idSchema = z.uuid('validation.id');

/** `?from=&to=` (both optional, YYYY-MM-DD). */
export function dateRangeFrom(request: NextRequest): DateRange {
  const params = request.nextUrl.searchParams;
  const read = (name: 'from' | 'to') => {
    const value = params.get(name);
    return value ? parseParam(name, value, isoDateSchema) : undefined;
  };
  return { from: read('from'), to: read('to') };
}

/**
 * Wraps a mock handler: 404 unless ENABLE_MOCK_API, optional latency, `X-Request-Id` on every
 * response, and validation/domain errors → the backend's error body.
 */
export function handle<Args extends [Request, ...unknown[]]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    const [request] = args;
    const incoming = request.headers.get(REQUEST_ID);
    const requestId = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : crypto.randomUUID();
    const fail = (status: number, code: ErrorCode, message: string, extra?: ErrorExtra) =>
      errorResponse(request, requestId, status, code, message, extra);

    let response: Response;
    if (!env.ENABLE_MOCK_API) {
      response = fail(404, 'ROUTE_NOT_FOUND', 'Not found');
    } else {
      if (env.MOCK_DELAY_MS) await new Promise((resolve) => setTimeout(resolve, env.MOCK_DELAY_MS));
      try {
        response = await handler(...args);
      } catch (error) {
        if (error instanceof ZodError) {
          response = fail(400, 'VALIDATION_FAILED', 'Validation failed', {
            details: fieldErrors(error),
          });
        } else if (error instanceof ValidationError) {
          response = fail(400, error.code, error.message, { details: error.details });
        } else if (error instanceof DomainError) {
          const retryAfter = 'retryAfterSeconds' in error ? error.retryAfterSeconds : undefined;
          response = fail(error.status, error.code, error.message, {
            headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
          });
        } else {
          throw error;
        }
      }
    }
    response.headers.set('X-Request-Id', requestId);
    return response;
  };
}

/** Like `handle`, plus 401 without a valid session and 403 without `permission` (server-enforced RBAC). */
export function withPermission<Context>(
  permission: Permission,
  handler: (request: NextRequest, context: Context, user: AdminUser) => Promise<Response>,
) {
  return handle(async (request: NextRequest, context: Context) => {
    const auth = await authorize(permission);
    if (!auth.ok) {
      throw auth.reason === 'unauthenticated' ? new UnauthorizedError() : new ForbiddenError();
    }
    return handler(request, context, auth.user);
  });
}
