import { describe, expect, it } from 'vitest';
import { decodeRefreshToken, deriveRefreshKey, encodeRefreshToken } from './refresh-token';

const key = deriveRefreshKey('dev-only-insecure-secret-change-me-0123456789');

describe('refresh token codec (mock, same format as the backend)', () => {
  it('round-trips and rejects tampering or another key', () => {
    const token = encodeRefreshToken(key, { sessionId: 'session-1', generation: 3 });
    expect(decodeRefreshToken(key, token)).toEqual({ sessionId: 'session-1', generation: 3 });

    const [id, , signature] = token.split('.');
    expect(decodeRefreshToken(key, `${id}.4.${signature}`)).toBeNull();
    expect(
      decodeRefreshToken(deriveRefreshKey('another-secret-another-secret-01'), token),
    ).toBeNull();
    for (const bad of [undefined, '', 'a.b', `${token}.x`])
      expect(decodeRefreshToken(key, bad)).toBeNull();
  });

  it('produces the same token as the backend for the same secret (cross-implementation)', () => {
    // Value computed by backend/src/modules/auth/utils/refresh-token.ts with the same inputs.
    expect(
      encodeRefreshToken(key, { sessionId: '5f0c4c2e-8d3a-4b8e-9c1d-2a3b4c5d6e7f', generation: 1 }),
    ).toBe(BACKEND_TOKEN);
  });
});

const BACKEND_TOKEN =
  '5f0c4c2e-8d3a-4b8e-9c1d-2a3b4c5d6e7f.1.4el9S--T73U9NJ2m9LDMdlM6PHcLjERBa9TodjvbkTM';
