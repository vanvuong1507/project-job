import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Mock backend only — the same refresh-token format as the real backend
 * (`backend/src/modules/auth/utils/refresh-token.ts`): `<sessionId>.<generation>.<signature>`,
 * signature = base64url HMAC-SHA256(key, `<sessionId>.<generation>`), key derived from the JWT secret.
 * The store keeps only the session and its current generation, never the token.
 */

export interface RefreshTokenClaims {
  sessionId: string;
  generation: number;
}

export function deriveRefreshKey(secret: string): Buffer {
  return createHmac('sha256', secret).update('refresh-token/v1').digest();
}

const sign = (key: Buffer, payload: string) =>
  createHmac('sha256', key).update(payload).digest('base64url');

export function encodeRefreshToken(key: Buffer, { sessionId, generation }: RefreshTokenClaims) {
  const payload = `${sessionId}.${generation}`;
  return `${payload}.${sign(key, payload)}`;
}

/** Claims of an authentic token, or `null` (malformed, tampered, other key). Never throws. */
export function decodeRefreshToken(key: Buffer, token: unknown): RefreshTokenClaims | null {
  if (typeof token !== 'string' || token.length > 200) return null;
  const [sessionId, generationText, signature, ...rest] = token.split('.');
  if (rest.length || !sessionId || !generationText || !signature) return null;
  if (!/^[\w-]{1,64}$/.test(sessionId) || !/^\d{1,9}$/.test(generationText)) return null;

  const expected = Buffer.from(sign(key, `${sessionId}.${generationText}`));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { sessionId, generation: Number(generationText) };
}
