import { userResponseSchema } from '../../src/modules/auth/dto/auth.dto.js';
import { errorBody, expectError } from '../utils/assertions.js';
import { createTestApp, type TestApp } from '../utils/test-app.js';

describe('auth', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => t.reset());
  afterAll(() => t.close());

  it('logs in (case-insensitive email) and sets httpOnly access + refresh cookies', async () => {
    const response = await t
      .http()
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:3001')
      .send({ email: 'ADMIN@example.com', password: 'admin123' })
      .expect(200);

    userResponseSchema.strict().parse(response.body);
    expect(response.body).toEqual({
      user: {
        id: expect.any(String),
        email: 'admin@example.com',
        name: 'Test Admin',
        role: 'ADMIN',
      },
    });
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    const [access, refresh] = response.headers['set-cookie'] as unknown as string[];
    expect(access).toMatch(/^admin_session=[\w-]+\.[\w-]+\.[\w-]+; Max-Age=900; Path=\/;/);
    expect(refresh).toMatch(
      /^admin_refresh=[\w-]+\.\d+\.[\w-]+; Max-Age=604800; Path=\/api\/auth;/,
    );
    for (const cookie of [access, refresh]) {
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).not.toContain('Secure');
    }
  });

  it.each([
    { email: 'admin@example.com', password: 'wrong' },
    { email: 'nobody@example.com', password: 'admin123' },
  ])('answers 401 "Invalid credentials" for %o', async (credentials) => {
    await t
      .http()
      .post('/api/auth/login')
      .send(credentials)
      .expect(expectError(401, 'INVALID_CREDENTIALS', 'Invalid credentials'));
  });

  it('validates the login body', async () => {
    const { body } = await t.http().post('/api/auth/login').send({ email: 'nope' }).expect(400);
    expect(Object.keys(body.details)).toEqual(['email', 'password']);
  });

  it('rejects malformed JSON', async () => {
    await t
      .http()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{oops')
      .expect(expectError(400, 'INVALID_JSON', 'Request body must be valid JSON'));
  });

  it('GET /me returns the user for a valid session and 401 otherwise', async () => {
    const cookie = await t.login();
    const { body } = await t.http().get('/api/auth/me').set('Cookie', cookie).expect(200);
    expect(body.user.email).toBe('admin@example.com');

    await t
      .http()
      .get('/api/auth/me')
      .expect(expectError(401, 'UNAUTHORIZED', 'Unauthorized'));
    await t.http().get('/api/auth/me').set('Cookie', 'admin_session=garbage').expect(401);
    await t
      .http()
      .get('/api/auth/me')
      .set('Cookie', `${cookie.slice(0, -2)}xx`) // tampered signature
      .expect(401);
  });

  it('puts sub + role + sid in a 15-minute access JWT (role read by the admin app without a DB call)', async () => {
    const token = (await t.login('VIEWER')).split('=')[1]!;
    const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString());
    expect(payload).toMatchObject({
      sub: expect.any(String),
      role: 'VIEWER',
      sid: expect.any(String),
    });
    expect(payload.exp - payload.iat).toBe(900);
  });

  it('accepts the session as `Authorization: Bearer` (admin app server → API)', async () => {
    const token = (await t.login()).split('=')[1]!;
    const { body } = await t
      .http()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(body.user.role).toBe('ADMIN');
    await t.http().get('/api/auth/me').set('Authorization', 'Bearer nope').expect(401);
  });

  it('logout clears both cookies, even without a session', async () => {
    const response = await t.http().post('/api/auth/logout').expect(204);
    const [access, refresh] = response.headers['set-cookie'] as unknown as string[];
    expect(access).toMatch(/^admin_session=; Path=\/; Expires=Thu, 01 Jan 1970/);
    expect(refresh).toMatch(/^admin_refresh=; Path=\/api\/auth; Expires=Thu, 01 Jan 1970/);
  });

  it('does not grant CORS to unknown origins', async () => {
    const response = await t
      .http()
      .options('/api/admin/events')
      .set('Origin', 'http://evil.test')
      .set('Access-Control-Request-Method', 'PUT');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('login brute-force protection', () => {
  it('locks an email after LOGIN_MAX_FAILED_ATTEMPTS failures, with Retry-After', async () => {
    const t = await createTestApp({ LOGIN_MAX_FAILED_ATTEMPTS: '2' });
    await t.reset();
    const attempt = (password: string) =>
      t.http().post('/api/auth/login').send({ email: 'admin@example.com', password });

    expect((await attempt('wrong')).status).toBe(401);
    expect((await attempt('wrong')).status).toBe(401);
    const blocked = await attempt('admin123'); // even the right password, while locked
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual(
      errorBody(429, 'LOGIN_LOCKED', 'Too many login attempts. Please try again later.'),
    );
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(14 * 60);

    // another account from the same IP is not affected
    await t
      .http()
      .post('/api/auth/login')
      .send({ email: 'viewer@example.com', password: 'viewer123' })
      .expect(200);
    await t.close();
  });

  it('keys the lockout on the end user IP forwarded by a trusted proxy (the admin app)', async () => {
    // Tests connect from loopback, which the default TRUST_PROXY trusts — like the admin server.
    const t = await createTestApp({ LOGIN_MAX_FAILED_ATTEMPTS: '1' });
    await t.reset();
    const attempt = (ip: string, password: string) =>
      t
        .http()
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'admin@example.com', password });

    expect((await attempt('203.0.113.1', 'wrong')).status).toBe(401);
    expect((await attempt('203.0.113.1', 'admin123')).status).toBe(429);
    // Another user behind the same admin server is not locked out.
    expect((await attempt('203.0.113.2', 'admin123')).status).toBe(200);
    await t.close();
  });

  it('ignores X-Forwarded-For from an untrusted peer', async () => {
    const t = await createTestApp({ LOGIN_MAX_FAILED_ATTEMPTS: '1', TRUST_PROXY: 'false' });
    await t.reset();
    const attempt = (ip: string, password: string) =>
      t
        .http()
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'admin@example.com', password });

    expect((await attempt('203.0.113.1', 'wrong')).status).toBe(401);
    // A spoofed header cannot dodge the lockout: the socket address is used.
    expect((await attempt('203.0.113.2', 'admin123')).status).toBe(429);
    await t.close();
  });

  it('caps all login requests per IP with LOGIN_RATE_LIMIT', async () => {
    const t = await createTestApp({ LOGIN_RATE_LIMIT: '2' });
    const attempt = () => t.http().post('/api/auth/login').send({ email: 'a@b.co', password: 'x' });
    expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual(
      errorBody(429, 'TOO_MANY_REQUESTS', /Too many requests to \/api\/auth/),
    );
    await t.close();
  });
});
