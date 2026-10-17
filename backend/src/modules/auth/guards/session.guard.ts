import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AppException } from '../../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../../common/exceptions/error-codes.js';
import { SESSION_COOKIE } from '../auth.constants.js';
import { AuthService } from '../auth.service.js';
import { RequirePermission } from '../decorators/require-permission.decorator.js';
import { can } from '../permissions.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

/**
 * The access token: `Authorization: Bearer` (the admin app's server → API, which forwards the token
 * kept in its own cookie) or the `admin_session` cookie (browser → API, e.g. Swagger).
 */
export function sessionTokenOf(request: Request): string | undefined {
  const header = request.header('authorization');
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim() || undefined;
  return (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
}

/**
 * 401 unless the request carries a valid access token of an active session (ACCESS_TOKEN_EXPIRED
 * when it merely expired: refresh and retry); then 403 unless the user's role grants the route's
 * permission (method-level wins over class-level). Use via `@Auth()`.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.auth.authenticate(sessionTokenOf(request));

    const permission = this.reflector.getAllAndOverride(RequirePermission, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (permission && !can(user.role, permission)) {
      throw new AppException(HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, 'Forbidden');
    }

    request.user = user;
    return true;
  }
}
