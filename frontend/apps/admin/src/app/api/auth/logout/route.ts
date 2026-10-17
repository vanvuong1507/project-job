import { handle, noContent } from '@/server/http/route-helpers';
import { signOut } from '@/server/users';

/** Mock of `POST /api/auth/logout` (§1.2): clears the session cookie. */
export const POST = handle(async (_request: Request) => {
  await signOut();
  return noContent();
});
