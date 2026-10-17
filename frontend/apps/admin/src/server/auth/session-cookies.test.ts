import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { accessTokenNeedsRefresh, sessionCookies } from './session-cookies';
import { parseSetCookies } from './set-cookie';

const tokenExpiringIn = (seconds: number) =>
  new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds)
    .sign(new TextEncoder().encode('any-secret'));

describe('accessTokenNeedsRefresh', () => {
  it('refreshes a missing, unreadable, expired or nearly expired token', async () => {
    expect(accessTokenNeedsRefresh(undefined)).toBe(true);
    expect(accessTokenNeedsRefresh('garbage')).toBe(true);
    expect(accessTokenNeedsRefresh(await tokenExpiringIn(-10))).toBe(true);
    expect(accessTokenNeedsRefresh(await tokenExpiringIn(30))).toBe(true); // within the 60s skew
  });

  it('keeps a token that is valid for longer than the skew', async () => {
    expect(accessTokenNeedsRefresh(await tokenExpiringIn(600))).toBe(false);
  });
});

describe('sessionCookies', () => {
  it('stores both tokens in httpOnly, SameSite=Lax cookies with their own lifetimes', () => {
    const cookies = sessionCookies({
      accessToken: 'a',
      accessTokenMaxAge: 900,
      refreshToken: 'r',
      refreshTokenMaxAge: 604_800,
    });
    expect(cookies).toEqual([
      { name: 'admin_session', value: 'a', options: expect.objectContaining({ maxAge: 900 }) },
      { name: 'admin_refresh', value: 'r', options: expect.objectContaining({ maxAge: 604_800 }) },
    ]);
    for (const { options } of cookies)
      expect(options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });
  });
});

describe('parseSetCookies', () => {
  it('reads value and Max-Age per cookie name', () => {
    const cookies = parseSetCookies([
      'admin_session=eyJ.a.b; Max-Age=900; Path=/; HttpOnly; SameSite=Lax',
      'admin_refresh=id.1.sig; Max-Age=604800; Path=/api/auth; HttpOnly',
      'broken',
    ]);
    expect(cookies.get('admin_session')).toEqual({ value: 'eyJ.a.b', maxAge: 900 });
    expect(cookies.get('admin_refresh')).toEqual({ value: 'id.1.sig', maxAge: 604_800 });
    expect(cookies.size).toBe(2);
  });
});
