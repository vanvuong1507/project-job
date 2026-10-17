import { describe, expect, it } from 'vitest';
import { can, isRole, PERMISSIONS, permissionForPath } from './permissions';

describe('can', () => {
  it('grants every permission to ADMIN', () => {
    for (const permission of PERMISSIONS) expect(can('ADMIN', permission)).toBe(true);
  });

  it('makes VIEWER read-only', () => {
    expect(can('VIEWER', 'metrics:read')).toBe(true);
    expect(can('VIEWER', 'events:read')).toBe(true);
    expect(can('VIEWER', 'metrics:write')).toBe(false);
    expect(can('VIEWER', 'events:write')).toBe(false);
    expect(can('VIEWER', 'events:delete')).toBe(false);
  });

  it('denies everything without a role', () => {
    expect(can(null, 'metrics:read')).toBe(false);
  });
});

describe('helpers', () => {
  it('recognises roles', () => {
    expect(isRole('VIEWER')).toBe(true);
    expect(isRole('MANAGER')).toBe(false);
  });

  it('maps routes to the permission they need', () => {
    expect(permissionForPath('/')).toBe('metrics:read');
    expect(permissionForPath('/events')).toBe('events:read');
    expect(permissionForPath('/events/123')).toBe('events:read');
    expect(permissionForPath('/forbidden')).toBeUndefined();
  });
});
