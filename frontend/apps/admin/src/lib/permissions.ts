import type { Role } from '@frontend/api-client';

/**
 * Role-based access control — pure and isomorphic: the server enforces it (server/authz), the UI uses it
 * only to hide controls. Add a permission here, grant it per role, then guard the page/action/handler.
 */

export const ROLES = ['ADMIN', 'VIEWER'] as const satisfies readonly Role[];

export const PERMISSIONS = [
  'metrics:read',
  'metrics:write',
  'events:read',
  'events:write',
  'events:delete',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  ADMIN: new Set(PERMISSIONS),
  VIEWER: new Set(['metrics:read', 'events:read']),
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return role ? ROLE_PERMISSIONS[role].has(permission) : false;
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Permission needed to open a page (optimistic check in proxy.ts; pages re-check on the server). */
export const ROUTE_PERMISSIONS: ReadonlyArray<{ prefix: string; permission: Permission }> = [
  { prefix: '/events', permission: 'events:read' },
  { prefix: '/', permission: 'metrics:read' },
];

export function permissionForPath(pathname: string): Permission | undefined {
  return ROUTE_PERMISSIONS.find(({ prefix }) =>
    prefix === '/' ? pathname === '/' : pathname === prefix || pathname.startsWith(`${prefix}/`),
  )?.permission;
}
