import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { z } from 'zod';
import { errorResponseSchema } from '../validation/schemas.js';

/**
 * OpenAPI from the same zod schemas that validate requests (zod 4 `toJSONSchema`), so the docs can
 * never drift from the validation. Custom refinements (e.g. "must be a Monday") aren't expressible
 * in JSON Schema — describe them with `.meta({ description })`.
 */

type OpenApiSchema = Record<string, unknown>;

export function toOpenApiSchema(
  schema: z.ZodType,
  io: 'input' | 'output' = 'output',
): OpenApiSchema {
  const json = z.toJSONSchema(schema, { target: 'openapi-3.0', io, unrepresentable: 'any' });
  return simplify(json) as OpenApiSchema;
}

/** Drops noise for readers: `$schema`, and regex `pattern`s next to a `format` that already says it. */
function simplify(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(simplify);
  if (!node || typeof node !== 'object') return node;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === '$schema') continue;
    if (key === 'pattern' && 'format' in node) continue;
    result[key] = simplify(value);
  }
  return result;
}

export const ApiZodBody = (schema: z.ZodType, description?: string) =>
  ApiBody({ schema: toOpenApiSchema(schema, 'input'), description });

export const ApiZodResponse = (status: number, schema: z.ZodType, description: string) =>
  ApiResponse({ status, description, schema: toOpenApiSchema(schema, 'output') });

/** One `@ApiQuery` per property of an object schema. */
export function ApiZodQuery(schema: z.ZodType) {
  const json = toOpenApiSchema(schema, 'input') as {
    properties?: Record<string, OpenApiSchema & { description?: string }>;
    required?: string[];
  };
  return applyDecorators(
    ...Object.entries(json.properties ?? {}).map(([name, property]) =>
      ApiQuery({
        name,
        required: json.required?.includes(name) ?? false,
        description: property.description,
        schema: property,
      }),
    ),
  );
}

export const ApiZodParam = (name: string, schema: z.ZodType, description?: string) =>
  ApiParam({ name, description, schema: toOpenApiSchema(schema, 'input') });

const ERRORS: Record<
  number,
  { description: string; code: string; error: string; details?: unknown }
> = {
  400: {
    description: 'Invalid input — `VALIDATION_FAILED` lists the problems by field in `details`',
    code: 'VALIDATION_FAILED',
    error: 'Validation failed',
    details: { 'days.0.covers': ['Must be 0 or more'] },
  },
  401: {
    description: 'Missing, invalid or expired session',
    code: 'UNAUTHORIZED',
    error: 'Unauthorized',
  },
  403: {
    description: 'The role lacks the required permission',
    code: 'FORBIDDEN',
    error: 'Forbidden',
  },
  404: {
    description: 'The record does not exist (`DAILY_METRIC_NOT_FOUND`, `EVENT_NOT_FOUND`)',
    code: 'EVENT_NOT_FOUND',
    error: 'Event not found',
  },
  409: {
    description: 'Conflicts with an existing record',
    code: 'DAILY_METRIC_DATE_TAKEN',
    error: 'Metrics for 2026-10-12 already exist',
  },
  429: {
    description: 'Too many requests — retry after `Retry-After` seconds',
    code: 'LOGIN_LOCKED',
    error: 'Too many login attempts. Please try again later.',
  },
};

/** Standard error responses (`errorResponseSchema`) with a realistic example per status. */
export const ApiErrorResponses = (...statuses: (keyof typeof ERRORS)[]) =>
  applyDecorators(
    ...statuses.map((status) => {
      const { description, ...example } = ERRORS[status]!;
      return ApiResponse({
        status,
        description,
        schema: {
          ...toOpenApiSchema(errorResponseSchema),
          example: {
            statusCode: status,
            ...example,
            requestId: '3f2c9a1e-5b7d-4c8e-9f10-2a3b4c5d6e7f',
            path: '/api/admin/events',
            timestamp: '2026-10-16T08:00:00.000Z',
          },
        },
      });
    }),
  );
