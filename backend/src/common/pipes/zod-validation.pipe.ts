import { HttpStatus, type PipeTransform } from '@nestjs/common';
import { AppException } from '../exceptions/app.exception.js';
import { ErrorCode } from '../exceptions/error-codes.js';
import type { z } from 'zod';

/** `{ "days.0.covers": ["Must be a whole number"] }` — dotted paths so nested form fields can be mapped. */
export type FieldErrors = Record<string, string[]>;

/** 400 `VALIDATION_FAILED` with `details` = field path → messages. */
export class ValidationException extends AppException {
  declare readonly details: FieldErrors;

  constructor(details: FieldErrors) {
    super(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_FAILED, 'Validation failed', details);
  }
}

export function toFieldErrors(error: z.ZodError, field?: string): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = field ?? (issue.path.join('.') || '_');
    (result[key] ??= []).push(issue.message);
  }
  return result;
}

/**
 * Validates and transforms a body, query object or single param with a zod schema.
 * Pass `field` for a single param (`@Param('id', new ZodValidationPipe(uuidSchema, 'id'))`) so the
 * error is reported under that name.
 */
export class ZodValidationPipe<S extends z.ZodType> implements PipeTransform<unknown, z.output<S>> {
  constructor(
    private readonly schema: S,
    private readonly field?: string,
  ) {}

  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (!result.success) throw new ValidationException(toFieldErrors(result.error, this.field));
    return result.data;
  }
}
