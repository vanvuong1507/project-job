import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../../common/swagger/zod-openapi.js';
import { BEARER_AUTH, COOKIE_AUTH } from '../auth.constants.js';
import { SessionGuard } from '../guards/session.guard.js';
import type { Permission } from '../permissions.js';
import { RequirePermission } from './require-permission.decorator.js';

/**
 * Protects a route: a valid session is required (401), and with `permission` the user's role must
 * grant it (403). Also documents both auth schemes and the error responses in Swagger.
 */
export function Auth(permission?: Permission) {
  return applyDecorators(
    UseGuards(SessionGuard),
    ...(permission
      ? [RequirePermission(permission), ApiErrorResponses(401, 403)]
      : [ApiErrorResponses(401)]),
    ApiCookieAuth(COOKIE_AUTH),
    ApiBearerAuth(BEARER_AUTH),
  );
}
