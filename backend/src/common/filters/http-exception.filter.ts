import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { AppException } from '../exceptions/app.exception.js';
import { codeForStatus, ErrorCode } from '../exceptions/error-codes.js';
import { TooManyRequestsException } from '../exceptions/too-many-requests.exception.js';
import type { RequestWithId } from '../middleware/request-context.middleware.js';

/** Postgres error codes translated instead of answering 500. */
const PG_UNIQUE_VIOLATION = '23505';
const PG_CHECK_VIOLATION = '23514';
/** Nest's router 404 message: "Cannot GET /api/nope". */
const ROUTER_NOT_FOUND = /^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /;

/** Every error body. `error` + `details` are what the frontend's ApiError reads. */
export interface ErrorBody {
  statusCode: number;
  code: ErrorCode;
  error: string;
  details?: unknown;
  requestId?: string;
  path: string;
  timestamp: string;
}

type Problem = Pick<ErrorBody, 'statusCode' | 'code' | 'error' | 'details'>;

/**
 * Turns every exception into one JSON shape (see `ErrorBody` / `errorResponseSchema`).
 * Unexpected errors are logged with the request id and answered with a generic 500, so no
 * internals (stack, SQL) reach clients.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const problem = toProblem(exception, request);

    if (exception instanceof TooManyRequestsException) {
      response.setHeader('Retry-After', String(exception.retryAfterSeconds));
    }
    if (problem.statusCode >= 500) {
      this.logger.error(
        {
          requestId: request.id,
          method: request.method,
          path: request.originalUrl,
          message: exception instanceof Error ? exception.message : String(exception),
        },
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ErrorBody = {
      statusCode: problem.statusCode,
      code: problem.code,
      error: problem.error,
      ...(problem.details === undefined ? {} : { details: problem.details }),
      requestId: request.id,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };
    response.status(problem.statusCode).json(body);
  }
}

function toProblem(exception: unknown, request: RequestWithId): Problem {
  if (exception instanceof AppException) {
    return {
      statusCode: exception.getStatus(),
      code: exception.code,
      error: exception.message,
      details: exception.details,
    };
  }
  if (exception instanceof ThrottlerException) {
    return {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: ErrorCode.TOO_MANY_REQUESTS,
      error: messageOf(exception),
    };
  }
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const message = messageOf(exception);
    if (statusCode === HttpStatus.NOT_FOUND && ROUTER_NOT_FOUND.test(message)) {
      return {
        statusCode,
        code: ErrorCode.ROUTE_NOT_FOUND,
        error: `Route ${request.method} ${request.originalUrl.split('?')[0]} not found`,
      };
    }
    return { statusCode, code: codeForStatus(statusCode), error: message };
  }
  if (exception instanceof QueryFailedError) {
    const pgCode = (exception.driverError as { code?: string } | undefined)?.code;
    if (pgCode === PG_UNIQUE_VIOLATION) {
      return {
        statusCode: HttpStatus.CONFLICT,
        code: ErrorCode.CONFLICT,
        error: 'A record with these values already exists',
      };
    }
    if (pgCode === PG_CHECK_VIOLATION) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: ErrorCode.BAD_REQUEST,
        error: 'A value is out of the allowed range',
      };
    }
  }
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ErrorCode.INTERNAL_ERROR,
    error: 'Internal server error',
  };
}

function messageOf(exception: HttpException): string {
  const response = exception.getResponse();
  if (typeof response === 'string') return response;
  const message = (response as { message?: unknown }).message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.map(String).join(', ');
  return exception.message;
}
