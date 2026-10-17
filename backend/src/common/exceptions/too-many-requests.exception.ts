import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception.js';
import type { ErrorCode } from './error-codes.js';

/** 429 that tells the client when to retry — HttpExceptionFilter adds the `Retry-After` header. */
export class TooManyRequestsException extends AppException {
  constructor(
    code: ErrorCode,
    message: string,
    readonly retryAfterSeconds: number,
  ) {
    super(HttpStatus.TOO_MANY_REQUESTS, code, message);
  }
}
