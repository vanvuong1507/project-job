import { decodeRefreshToken, deriveRefreshKey, encodeRefreshToken } from './refresh-token.js';

const key = deriveRefreshKey('test-secret-test-secret-test-secret-0123');
const sessionId = '5f0c4c2e-8d3a-4b8e-9c1d-2a3b4c5d6e7f';

describe('refresh token codec', () => {
  it('round-trips session id and generation', () => {
    const token = encodeRefreshToken(key, { sessionId, generation: 7 });
    expect(token).toMatch(new RegExp(`^${sessionId}\\.7\\.[\\w-]{43}$`));
    expect(decodeRefreshToken(key, token)).toEqual({ sessionId, generation: 7 });
  });

  it('rejects tampering, another key and malformed input', () => {
    const token = encodeRefreshToken(key, { sessionId, generation: 1 });
    const [id, , signature] = token.split('.');

    expect(decodeRefreshToken(key, `${id}.2.${signature}`)).toBeNull();
    expect(
      decodeRefreshToken(deriveRefreshKey('another-secret-another-secret-0123'), token),
    ).toBeNull();
    for (const bad of [
      undefined,
      42,
      '',
      'a.b',
      `${token}.extra`,
      `not-a-uuid.1.${signature}`,
      'x'.repeat(500),
    ])
      expect(decodeRefreshToken(key, bad)).toBeNull();
  });

  it('derives a key different from the JWT secret itself', () => {
    expect(deriveRefreshKey('s').equals(Buffer.from('s'))).toBe(false);
  });
});
