import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AdminUser } from '../dto/auth.dto.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

/** The user attached by `SessionGuard` — only on routes protected by `@Auth()`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AdminUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user!,
);
