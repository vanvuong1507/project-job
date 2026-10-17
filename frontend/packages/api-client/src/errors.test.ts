import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';

describe('ApiError.fromResponse', () => {
  it('reads code, details, requestId and Retry-After from a backend error', () => {
    const res = new Response(null, { status: 429, headers: { 'Retry-After': '120' } });
    const error = ApiError.fromResponse(res, {
      statusCode: 429,
      code: 'LOGIN_LOCKED',
      error: 'Too many login attempts',
      requestId: 'req-1',
      path: '/api/auth/login',
      timestamp: '2026-10-16T00:00:00.000Z',
    });

    expect(error).toMatchObject({
      status: 429,
      code: 'LOGIN_LOCKED',
      message: 'Too many login attempts',
      requestId: 'req-1',
      retryAfterSeconds: 120,
    });
  });

  it('falls back to a status code and the X-Request-Id header for foreign bodies', () => {
    const res = new Response(null, {
      status: 502,
      statusText: 'Bad Gateway',
      headers: { 'X-Request-Id': 'req-2' },
    });
    const error = ApiError.fromResponse(res, null);

    expect(error).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'Bad Gateway',
      requestId: 'req-2',
    });
    expect(error.retryAfterSeconds).toBeUndefined();
  });

  it('uses NETWORK_ERROR for failures without a response', () => {
    expect(new ApiError(0, 'Network error').code).toBe('NETWORK_ERROR');
    expect(new ApiError(0, 'Timed out', undefined, { code: 'TIMEOUT' }).code).toBe('TIMEOUT');
  });
});
