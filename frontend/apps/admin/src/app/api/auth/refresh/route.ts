import { z } from 'zod';
import { repositories } from '@/server/data-source';
import { UnauthorizedError } from '@/server/errors';
import { handle, json } from '@/server/http/route-helpers';
import { createSession, deleteSession, getRefreshToken } from '@/server/session';

const bodySchema = z
  .object({ refreshToken: z.string().max(200, 'refreshToken is too long').optional() })
  .catch({});

/**
 * Mock of `POST /api/auth/refresh` (backend contract): the refresh token from the body or the
 * `admin_refresh` cookie → new access + refresh cookies (rotation); on failure both are cleared.
 */
export const POST = handle(async (request: Request) => {
  const body = bodySchema.parse(await request.json().catch(() => ({})));
  const refreshToken = body.refreshToken ?? (await getRefreshToken());
  try {
    if (!refreshToken)
      throw new UnauthorizedError(
        'The refresh token is invalid or expired. Sign in again.',
        'INVALID_REFRESH_TOKEN',
      );
    const { user, tokens } = await repositories.auth.refresh(refreshToken);
    await createSession(tokens);
    return json({ user });
  } catch (error) {
    if (error instanceof UnauthorizedError) await deleteSession();
    throw error;
  }
});
