import type { Response } from 'supertest';
import type { ErrorCode } from '../../src/common/exceptions/error-codes.js';

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/** The full error body the API returns for a given status/code/message. */
export function errorBody(
  status: number,
  code: ErrorCode,
  error: string | RegExp,
  details?: unknown,
) {
  return {
    statusCode: status,
    code,
    error: typeof error === 'string' ? error : expect.stringMatching(error),
    ...(details === undefined ? {} : { details }),
    requestId: expect.any(String),
    path: expect.stringMatching(/^\/api\//),
    timestamp: expect.stringMatching(ISO_TIMESTAMP),
  };
}

/** supertest assertion: `.expect(expectError(404, 'EVENT_NOT_FOUND', 'Event not found'))`. */
export const expectError =
  (status: number, code: ErrorCode, error: string | RegExp, details?: unknown) =>
  (res: Response) => {
    expect(res.status).toBe(status);
    expect(res.body).toEqual(errorBody(status, code, error, details));
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  };
