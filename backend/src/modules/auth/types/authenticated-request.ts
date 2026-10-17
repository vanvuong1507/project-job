import type { RequestWithId } from '../../../common/middleware/request-context.middleware.js';
import type { AdminUser } from '../dto/auth.dto.js';

/** A request that went through `SessionGuard`. */
export type AuthenticatedRequest = RequestWithId & { user?: AdminUser };
