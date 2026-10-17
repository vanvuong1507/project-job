import { parseSeedUsers } from './seed-config.js';
import { assertSafeSeed } from './seed.js';

describe('seed accounts', () => {
  it('defaults to the same two accounts as the frontend admin app', () => {
    expect(parseSeedUsers({})).toEqual([
      { email: 'admin@example.com', password: 'admin123', name: 'Restaurant Admin', role: 'ADMIN' },
      {
        email: 'viewer@example.com',
        password: 'viewer123',
        name: 'Read-only Viewer',
        role: 'VIEWER',
      },
    ]);
  });

  it('rejects short passwords', () => {
    expect(() => parseSeedUsers({ VIEWER_PASSWORD: 'short' })).toThrow(/VIEWER_PASSWORD/);
  });
});

describe('assertSafeSeed', () => {
  const strong = parseSeedUsers({
    ADMIN_PASSWORD: 'S3cure-admin!',
    VIEWER_PASSWORD: 'S3cure-viewer!',
  });

  it('allows anything outside production', () => {
    expect(() =>
      assertSafeSeed({ production: false, demoData: true, users: parseSeedUsers({}) }),
    ).not.toThrow();
  });

  it('refuses demo data in production', () => {
    expect(() => assertSafeSeed({ production: true, demoData: true, users: strong })).toThrow(
      /--users-only/,
    );
  });

  it('refuses the example passwords in production', () => {
    expect(() =>
      assertSafeSeed({ production: true, demoData: false, users: parseSeedUsers({}) }),
    ).toThrow(/admin@example.com, viewer@example.com/);
    expect(() =>
      assertSafeSeed({ production: true, demoData: false, users: strong }),
    ).not.toThrow();
  });
});
