import { HttpStatus } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppException } from '../exceptions/app.exception.js';
import { ErrorCode } from '../exceptions/error-codes.js';

/**
 * Turns body-parser failures into AppExceptions (rendered by HttpExceptionFilter). Registered right
 * after the JSON parser; without it Nest would answer with the raw parser message.
 */
export function bodyParserErrors(
  error: unknown,
  _request: Request,
  _response: Response,
  next: NextFunction,
): void {
  const type = (error as { type?: string } | null)?.type;
  if (type === 'entity.parse.failed') {
    next(
      new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.INVALID_JSON,
        'Request body must be valid JSON',
      ),
    );
  } else if (type === 'entity.too.large') {
    next(
      new AppException(
        HttpStatus.PAYLOAD_TOO_LARGE,
        ErrorCode.PAYLOAD_TOO_LARGE,
        'Request body is too large',
      ),
    );
  } else {
    next(error);
  }
}
