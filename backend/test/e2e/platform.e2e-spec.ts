import { expectError } from '../utils/assertions.js';
import { createTestApp, type TestApp } from '../utils/test-app.js';

describe('platform', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('GET /api/health/live answers without touching the database', async () => {
    await t.http().get('/api/health/live').expect(200, { status: 'ok' });
  });

  it.each(['/api/health', '/api/health/ready'])('GET %s checks the database', async (path) => {
    await t.http().get(path).expect(200, { status: 'ok', database: 'up' });
  });

  it('echoes a valid X-Request-Id and creates one otherwise', async () => {
    const echoed = await t.http().get('/api/health/live').set('X-Request-Id', 'abc-123');
    expect(echoed.headers['x-request-id']).toBe('abc-123');
    const created = await t.http().get('/api/health/live').set('X-Request-Id', 'bad id!');
    expect(created.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sets security and cache headers', async () => {
    const { headers } = await t.http().get('/api/health/live');
    expect(headers['cache-control']).toBe('no-store');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-powered-by']).toBeUndefined();
  });

  it('answers unknown routes with the standard error shape', async () => {
    await t
      .http()
      .get('/api/nope')
      .expect(expectError(404, 'ROUTE_NOT_FOUND', 'Route GET /api/nope not found'));
  });

  describe('Swagger', () => {
    it('serves the UI at /api/docs', async () => {
      const { text } = await t.http().get('/api/docs').expect(200);
      expect(text).toContain('swagger-ui');
    });

    it('documents every endpoint with schemas and both auth schemes', async () => {
      const { body } = await t.http().get('/api/docs-json').expect(200);
      expect(body.info.title).toBe('Revenue Dashboard API');
      expect(Object.keys(body.paths).sort()).toEqual([
        '/api/admin/daily-metrics',
        '/api/admin/daily-metrics/{id}',
        '/api/admin/events',
        '/api/admin/events/{id}',
        '/api/admin/weeks/{weekStart}',
        '/api/auth/login',
        '/api/auth/logout',
        '/api/auth/me',
        '/api/auth/refresh',
        '/api/dashboard/revenue-trend',
        '/api/health',
        '/api/health/live',
        '/api/health/ready',
      ]);
      expect(Object.keys(body.components.securitySchemes).sort()).toEqual([
        'bearer',
        'session-cookie',
      ]);

      const login = body.paths['/api/auth/login'].post;
      expect(login.requestBody.content['application/json'].schema.required).toEqual([
        'email',
        'password',
      ]);
      expect(Object.keys(login.responses).sort()).toEqual(['200', '400', '401', '429']);

      const putWeek = body.paths['/api/admin/weeks/{weekStart}'].put;
      expect(putWeek.security).toEqual([{ 'session-cookie': [] }, { bearer: [] }]);
      expect(Object.keys(putWeek.responses).sort()).toEqual(['200', '400', '401', '403']);
    });

    it('can be turned off', async () => {
      const off = await createTestApp({ SWAGGER_ENABLED: 'false' });
      await off.http().get('/api/docs-json').expect(404);
      await off.close();
    });
  });
});
