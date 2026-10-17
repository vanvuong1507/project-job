import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Refresh token format: `<sessionId>.<generation>.<signature>`, signature = base64url
 * HMAC-SHA256(key, `<sessionId>.<generation>`). Only the server can mint one; the database keeps the
 * session and its current generation, never the token. The key is derived from JWT_SECRET with a
 * fixed label, so a refresh token can never be mistaken for (or turned into) an access token.
 */

export interface RefreshTokenClaims {
  sessionId: string;
  generation: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LENGTH = 200;

export function deriveRefreshKey(secret: string): Buffer {
  return createHmac('sha256', secret).update('refresh-token/v1').digest();
}

function sign(key: Buffer, payload: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

export function encodeRefreshToken(key: Buffer, { sessionId, generation }: RefreshTokenClaims) {
  const payload = `${sessionId}.${generation}`;
  return `${payload}.${sign(key, payload)}`;
}

/** The claims of an authentic token, or `null` (malformed, tampered, other key). Never throws. */
export function decodeRefreshToken(key: Buffer, token: unknown): RefreshTokenClaims | null {
  if (typeof token !== 'string' || token.length > MAX_LENGTH) return null;
  const [sessionId, generationText, signature, ...rest] = token.split('.');
  if (rest.length || !sessionId || !generationText || !signature) return null;
  if (!UUID.test(sessionId) || !/^\d{1,9}$/.test(generationText)) return null;

  const expected = Buffer.from(sign(key, `${sessionId}.${generationText}`));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { sessionId, generation: Number(generationText) };
}
