import { UnauthorizedError } from '@/server/errors';
import { handle, json } from '@/server/http/route-helpers';
import { getCurrentUser } from '@/server/users';

/** Mock of `GET /api/auth/me` (§1.2). */
export const GET = handle(async (_request: Request) => {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return json({ user });
});
