import { Reflector } from '@nestjs/core';
import type { Permission } from '../permissions.js';

/** Permission a route needs; read by `SessionGuard`. Use it through `@Auth(permission)`. */
export const RequirePermission = Reflector.createDecorator<Permission>();
