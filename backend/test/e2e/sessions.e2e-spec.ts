import { SignJWT } from 'jose';
import { userResponseSchema } from '../../src/modules/auth/dto/auth.dto.js';
import { expectError } from '../utils/assertions.js';
import { testConfig } from '../utils/test-env.js';
import { cookieValue, createTestApp, type TestApp } from '../utils/test-app.js';

const tokensOf = (response: { headers: Record<string, unknown> }) => ({
  access: cookieValue(response.headers['set-cookie'], 'admin_session')!,
  refresh: cookieValue(response.headers['set-cookie'], 'admin_refresh')!,
});

/** Refresh-token sessions: rotation, reuse detection, revocation and expiry. */
describe('sessions (refresh tokens)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  beforeEach(() => t.reset());
  afterAll(() => t.close());

  const refreshWithCookie = (refresh: string) =>
    t.http().post('/api/auth/refresh').set('Cookie', `admin_refresh=${refresh}`);
  const refreshWithBody = (refreshToken: string) =>
    t.http().post('/api/auth/refresh').send({ refreshToken });
  const me = (access: string) =>
    t.http().get('/api/auth/me').set('Authorization', `Bearer ${access}`);
  const sessionRow = async (refresh: string) =>
    (
      await t.dataSource.query(
        'SELECT generation, revoked_at, revoked_reason FROM auth_sessions WHERE id = $1',
        [refresh.split('.')[0]],
      )
    )[0];

  it('rotates: the cookie refresh returns the user and NEW access + refresh tokens', async () => {
    const session = await t.signIn('VIEWER');
    const response = await refreshWithCookie(session.refresh).expect(200);

    userResponseSchema.strict().parse(response.body);
    expect(response.body.user.role).toBe('VIEWER');
    const next = tokensOf(response);
    expect(next.refresh).not.toBe(session.refresh);
    expect(next.refresh.split('.')[1]).toBe('1'); // generation 0 → 1
    await me(next.access).expect(200);
    await me(session.access).expect(200); // older access tokens live until they expire
  });

  it('accepts the refresh token in the body (server-side clients)', async () => {
    const session = await t.signIn();
    const response = await refreshWithBody(session.refresh).expect(200);
    await me(tokensOf(response).access).expect(200);
  });

  it('answers a just-rotated token with the SAME successor (parallel requests, no logout)', async () => {
    const session = await t.signIn();
    const first = tokensOf(await refreshWithBody(session.refresh).expect(200));
    const again = tokensOf(await refreshWithBody(session.refresh).expect(200));

    expect(again.refresh).toBe(first.refresh);
    expect((await sessionRow(session.refresh)).generation).toBe(1);
    await refreshWithBody(first.refresh).expect(200); // the successor still works
  });

  it('serialises concurrent refreshes: all succeed with one successor', async () => {
    const session = await t.signIn();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => refreshWithBody(session.refresh)),
    );

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200]);
    expect(new Set(responses.map((response) => tokensOf(response).refresh)).size).toBe(1);
    expect((await sessionRow(session.refresh)).generation).toBe(1);
  });

  it('revokes the whole session when an old refresh token is replayed (theft)', async () => {
    const session = await t.signIn();
    const gen1 = tokensOf(await refreshWithBody(session.refresh).expect(200));
    const gen2 = tokensOf(await refreshWithBody(gen1.refresh).expect(200));

    const replay = await refreshWithBody(session.refresh).expect(
      expectError(401, 'REFRESH_TOKEN_REUSED', /old refresh token was reused/),
    );
    expect(String(replay.headers['set-cookie'])).toMatch(/admin_refresh=;/); // cookies cleared

    // Attacker and victim both lose the session: the newest tokens are dead too.
    await refreshWithBody(gen2.refresh).expect(
      expectError(401, 'INVALID_REFRESH_TOKEN', /invalid or expired/),
    );
    await me(gen2.access).expect(expectError(401, 'UNAUTHORIZED', 'Unauthorized'));
    expect(await sessionRow(session.refresh)).toMatchObject({ revoked_reason: 'reuse' });
  });

  it('logout revokes the session at once: its access token and refresh token stop working', async () => {
    const session = await t.signIn();
    const other = await t.signIn(); // a second sign-in (another device) is unaffected

    await t.http().post('/api/auth/logout').set('Cookie', session.cookie).expect(204);

    await me(session.access).expect(401);
    await refreshWithBody(session.refresh).expect(401);
    expect(await sessionRow(session.refresh)).toMatchObject({ revoked_reason: 'logout' });
    await me(other.access).expect(200);
    await refreshWithBody(other.refresh).expect(200);
  });

  it('logout also works with the refresh token in the body or with only the access token', async () => {
    const byBody = await t.signIn();
    await t.http().post('/api/auth/logout').send({ refreshToken: byBody.refresh }).expect(204);
    await refreshWithBody(byBody.refresh).expect(401);

    const byBearer = await t.signIn();
    await t
      .http()
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${byBearer.access}`)
      .expect(204);
    await refreshWithBody(byBearer.refresh).expect(401);
  });

  it.each([
    ['missing', undefined],
    ['garbage', 'garbage'],
    ['unknown session', '00000000-0000-4000-8000-000000000000.0.c2lnbmF0dXJl'],
  ])('rejects a %s refresh token', async (_, token) => {
    await (token ? refreshWithBody(token) : t.http().post('/api/auth/refresh')).expect(
      expectError(401, 'INVALID_REFRESH_TOKEN', /invalid or expired/),
    );
  });

  it('rejects a tampered refresh token (generation bumped without the key)', async () => {
    const session = await t.signIn();
    const [id, , signature] = session.refresh.split('.');
    await refreshWithBody(`${id}.5.${signature}`).expect(401);
    await refreshWithBody(session.refresh).expect(200); // the genuine one is untouched
  });

  it('validates the refresh body', async () => {
    const { body } = await t
      .http()
      .post('/api/auth/refresh')
      .send({ refreshToken: 42 })
      .expect(400);
    expect(body.details).toHaveProperty('refreshToken');
  });

  it('expires: sliding expiry and the absolute session limit', async () => {
    const sliding = await t.signIn();
    await t.dataSource.query(
      "UPDATE auth_sessions SET expires_at = now() - interval '1 second' WHERE id = $1",
      [sliding.refresh.split('.')[0]],
    );
    await refreshWithBody(sliding.refresh).expect(401);
    expect(await sessionRow(sliding.refresh)).toMatchObject({ revoked_reason: 'expired' });
    await me(sliding.access).expect(401); // an expired session also stops its access tokens

    const absolute = await t.signIn();
    await t.dataSource.query(
      "UPDATE auth_sessions SET absolute_expires_at = now() - interval '1 second' WHERE id = $1",
      [absolute.refresh.split('.')[0]],
    );
    await refreshWithBody(absolute.refresh).expect(401);
  });

  it('says ACCESS_TOKEN_EXPIRED for an expired access token (refresh and retry)', async () => {
    const session = await t.signIn();
    const { sub, sid, role } = JSON.parse(
      Buffer.from(session.access.split('.')[1]!, 'base64url').toString(),
    );
    const expired = await new SignJWT({ role, sid })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(sub)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 1000)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(new TextEncoder().encode(testConfig().auth.jwtSecret));

    await me(expired).expect(expectError(401, 'ACCESS_TOKEN_EXPIRED', /Refresh it and retry/));
  });

  it('caps refreshes per IP with REFRESH_RATE_LIMIT, independently of logins', async () => {
    const limited = await createTestApp({ REFRESH_RATE_LIMIT: '2' });
    try {
      for (let i = 0; i < 2; i++)
        await limited.http().post('/api/auth/refresh').send({ refreshToken: 'x' }).expect(401);
      await limited
        .http()
        .post('/api/auth/refresh')
        .send({ refreshToken: 'x' })
        .expect(expectError(429, 'TOO_MANY_REQUESTS', /Too many requests/));
      await limited.signIn(); // the login throttler is separate
    } finally {
      await limited.close();
    }
  });
});
