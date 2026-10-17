import type { LoggerService } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { REQUEST_ID_HEADER } from '../constants/app.constants.js';

const VALID_REQUEST_ID = /^[\w-]{1,128}$/;

export type RequestWithId = Request & { id?: string };

/**
 * Per request: reuse the caller's `X-Request-Id` (the frontend sends one) or create one, echo it,
 * mark the response `no-store`, and write one access-log line when the response finishes
 * (a structured object in JSON mode, a single readable line otherwise).
 */
export function requestContext(logger: LoggerService, { json }: { json: boolean }) {
  return (request: RequestWithId, response: Response, next: NextFunction) => {
    const incoming = request.header(REQUEST_ID_HEADER);
    const id = incoming && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    const started = process.hrtime.bigint();
    request.id = id;
    response.setHeader(REQUEST_ID_HEADER, id);
    response.setHeader('Cache-Control', 'no-store');

    response.on('finish', () => {
      const entry = {
        requestId: id,
        method: request.method,
        path: request.originalUrl,
        status: response.statusCode,
        durationMs: Number((process.hrtime.bigint() - started) / 1_000_000n),
      };
      // JSON logs get the structured entry; local logs one readable line.
      const message = json
        ? entry
        : `${entry.method} ${entry.path} ${entry.status} ${entry.durationMs}ms [${entry.requestId}]`;
      if (response.statusCode >= 500) logger.error(message, undefined, 'HTTP');
      else logger.log(message, 'HTTP');
    });
    next();
  };
}
