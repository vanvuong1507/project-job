import { can, isRole, PERMISSIONS } from './permissions.js';

describe('permissions', () => {
  it('grants ADMIN everything', () => {
    expect(PERMISSIONS.every((p) => can('ADMIN', p))).toBe(true);
  });

  it('makes VIEWER read-only', () => {
    expect(PERMISSIONS.filter((p) => can('VIEWER', p))).toEqual(['metrics:read', 'events:read']);
  });

  it('denies a missing role', () => {
    expect(can(undefined, 'metrics:read')).toBe(false);
    expect(can(null, 'events:read')).toBe(false);
  });

  it('recognises roles', () => {
    expect(isRole('ADMIN')).toBe(true);
    expect(isRole('admin')).toBe(false);
    expect(isRole(1)).toBe(false);
  });
});
