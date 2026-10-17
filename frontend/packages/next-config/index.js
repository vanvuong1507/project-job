// Plain JS (not TS): next.config.ts loads this at build time, outside of transpilePackages.

/** Internal packages that ship raw TypeScript and must be compiled by Next. */
const WORKSPACE_PACKAGES = ['@frontend/ui', '@frontend/api-client', '@frontend/i18n'];

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/**
 * Shared Next.js config for every app in the monorepo.
 * @param {import('next').NextConfig} [overrides] app-specific options, shallow-merged last
 * @returns {import('next').NextConfig}
 */
export function createNextConfig(overrides = {}) {
  return {
    reactStrictMode: true,
    poweredByHeader: false,
    typedRoutes: true,
    transpilePackages: WORKSPACE_PACKAGES,
    async headers() {
      return [{ source: '/:path*', headers: SECURITY_HEADERS }];
    },
    ...overrides,
  };
}
