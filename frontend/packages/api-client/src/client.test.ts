import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHttpClient } from './client';
import { ApiError } from './errors';
import { headersInterceptor, requestIdInterceptor, type Interceptor } from './interceptors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function fakeFetch(...responses: Array<Response | Error>) {
  const calls: Array<{ url: string; method: string; headers: Headers }> = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
    });
    const next = responses.shift() ?? json({});
    if (next instanceof Error) throw next;
    return next;
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

describe('interceptors', () => {
  it('run request hooks in order and inject headers without overriding explicit ones', async () => {
    const { impl, calls } = fakeFetch(json({ ok: true }));
    const order: string[] = [];
    const api = createHttpClient({
      baseUrl: 'http://api.test',
      fetch: impl,
      interceptors: [
        { request: () => void order.push('first') },
        requestIdInterceptor(() => 'req-1'),
        headersInterceptor(() => ({ 'Accept-Language': 'vi', Authorization: 'Bearer token' })),
        { request: () => void order.push('last') },
      ],
    });

    await api.get('/items', { headers: { 'Accept-Language': 'en' } });

    expect(order).toEqual(['first', 'last']);
    expect(calls[0]!.headers.get('x-request-id')).toBe('req-1');
    expect(calls[0]!.headers.get('authorization')).toBe('Bearer token');
    expect(calls[0]!.headers.get('accept-language')).toBe('en');
  });

  it('lets error hooks transform failures and response hooks observe successes', async () => {
    const seen: number[] = [];
    const { impl } = fakeFetch(json({ ok: true }), json({ error: 'Nope' }, 401));
    const interceptor: Interceptor = {
      response: (res) => void seen.push(res.status),
      error: (error) => (error.status === 401 ? new ApiError(401, 'Session expired') : error),
    };
    const api = createHttpClient({
      baseUrl: 'http://api.test',
      fetch: impl,
      interceptors: [interceptor],
    });

    await api.get('/ok');
    await expect(api.get('/secret')).rejects.toMatchObject({
      status: 401,
      message: 'Session expired',
    });
    expect(seen).toEqual([200]);
  });
});

describe('retry', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('retries idempotent requests on 503 / network errors with exponential backoff', async () => {
    const { impl, calls } = fakeFetch(
      json({}, 503),
      new TypeError('fetch failed'),
      json({ value: 1 }),
    );
    const api = createHttpClient({
      baseUrl: 'http://api.test',
      fetch: impl,
      retry: { attempts: 3, baseDelayMs: 100 },
    });

    const result = api.get<{ value: number }>('/flaky');
    await vi.advanceTimersByTimeAsync(100); // after attempt 1
    await vi.advanceTimersByTimeAsync(200); // after attempt 2

    await expect(result).resolves.toEqual({ value: 1 });
    expect(calls).toHaveLength(3);
  });

  it('never retries non-idempotent methods or client errors', async () => {
    const post = fakeFetch(json({}, 503));
    const api = createHttpClient({
      baseUrl: 'http://api.test',
      fetch: post.impl,
      retry: { attempts: 3 },
    });
    await expect(api.post('/orders', { a: 1 })).rejects.toMatchObject({ status: 503 });
    expect(post.calls).toHaveLength(1);

    const notFound = fakeFetch(json({ error: 'Missing' }, 404));
    const api2 = createHttpClient({
      baseUrl: 'http://api.test',
      fetch: notFound.impl,
      retry: { attempts: 3 },
    });
    await expect(api2.get('/missing')).rejects.toMatchObject({ status: 404, message: 'Missing' });
    expect(notFound.calls).toHaveLength(1);
  });

  it('gives up after the last attempt with the last error', async () => {
    const { impl, calls } = fakeFetch(json({}, 502), json({}, 504));
    const api = createHttpClient({
      baseUrl: 'http://api.test',
      fetch: impl,
      retry: { attempts: 2, baseDelayMs: 10 },
    });

    const result = api.get('/down');
    const assertion = expect(result).rejects.toMatchObject({ status: 504 });
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    expect(calls).toHaveLength(2);
  });
});
