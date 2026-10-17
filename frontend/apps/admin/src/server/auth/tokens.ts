import 'server-only';
import { jwtVerify, SignJWT } from 'jose';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Role } from '@frontend/api-client';
import { isRole } from '@/lib/permissions';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;
const KEY_LENGTH = 64;

/** `scrypt$<salt-hex>$<hash-hex>` — the plain password is never stored. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

const key = (secret: string) => new TextEncoder().encode(secret);

/** Access-token claims: `sub` (user), `role` (read by proxy.ts without verifying), `sid` (session). */
export interface SessionClaims {
  userId: string;
  role: Role;
  sessionId: string;
}

/** Mock backend only: signs an access token like the real backend does. */
export function signSessionToken(
  { userId, role, sessionId }: SessionClaims,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  return new SignJWT({ role, sid: sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key(secret));
}

/** Claims from a valid, unexpired access token; `null` otherwise (never throws). */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'] });
    const { sub, role, sid } = payload;
    return sub && typeof sid === 'string' && isRole(role)
      ? { userId: sub, role, sessionId: sid }
      : null;
  } catch {
    return null;
  }
}
