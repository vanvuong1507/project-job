import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from './error-codes.js';

/**
 * The API's exception: HTTP status + machine-readable `code` + human message (+ optional details).
 * Rendered by HttpExceptionFilter as `{ statusCode, code, error, details?, requestId, path, timestamp }`.
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message, status);
  }
}
