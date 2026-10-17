import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { hashPassword, signSessionToken, verifyPassword, verifySessionToken } from './tokens';

const SECRET = 'test-secret-that-is-at-least-32-characters';

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const stored = await hashPassword('admin123');

    expect(stored).not.toContain('admin123');
    expect(await verifyPassword('admin123', stored)).toBe(true);
    expect(await verifyPassword('admin124', stored)).toBe(false);
    expect(await verifyPassword('admin123', 'plain-text')).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });
});

describe('session tokens', () => {
  const claims = { userId: 'user-1', role: 'VIEWER', sessionId: 'session-1' } as const;

  it('round-trips the user id, role and session id, with the given lifetime', async () => {
    const token = await signSessionToken(claims, SECRET, 900);
    expect(await verifySessionToken(token, SECRET)).toEqual(claims);
    const { exp, iat } = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString());
    expect(exp - iat).toBe(900);
  });

  it('rejects a token without a session id (issued before refresh tokens)', async () => {
    const noSid = await new SignJWT({ role: 'ADMIN' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySessionToken(noSid, SECRET)).toBeNull();
  });

  it('rejects a token without a valid role claim', async () => {
    const noRole = await new SignJWT()
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(SECRET));
    expect(await verifySessionToken(noRole, SECRET)).toBeNull();
  });

  it('rejects missing, tampered, foreign and expired tokens', async () => {
    const token = await signSessionToken({ ...claims, role: 'ADMIN' }, SECRET, 900);
    const expired = await new SignJWT()
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-1')
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(SECRET));

    expect(await verifySessionToken(undefined, SECRET)).toBeNull();
    expect(await verifySessionToken(`${token}x`, SECRET)).toBeNull();
    expect(await verifySessionToken(token, 'another-secret-that-is-32-characters-long')).toBeNull();
    expect(await verifySessionToken(expired, SECRET)).toBeNull();
  });
});
