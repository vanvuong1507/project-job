/**
 * Role-based access control. Mirrors `../frontend/apps/admin/src/lib/permissions.ts` — the admin UI
 * uses its copy to hide controls; this one is the authority (403 on violation). Change both together.
 */

export const ROLES = ['ADMIN', 'VIEWER'] as const;
export type Role = (typeof ROLES)[number];

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
