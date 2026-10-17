import type { Instrumentation } from 'next';

/** Runs once per server instance. Logs the effective (non-secret) configuration. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { logger } = await import('./server/logger');
  logger.info('server started', {
    nodeEnv: process.env.NODE_ENV,
    dataSource: process.env.DATA_SOURCE ?? 'mock',
    apiUrl: process.env.DATA_SOURCE === 'api' ? process.env.API_URL : undefined,
    mockApi: process.env.ENABLE_MOCK_API === 'true',
  });
  // Not fatal: CI runs the production build with the example env. Real deployments must replace it.
  if (process.env.NODE_ENV === 'production' && process.env.AUTH_SECRET === DEV_AUTH_SECRET) {
    logger.warn('AUTH_SECRET is the public development default; set a real secret in production');
  }
}

/** The example value from .env.example (also the backend's development JWT_SECRET). */
const DEV_AUTH_SECRET = 'dev-only-insecure-secret-change-me-0123456789';

/** Every uncaught server error (render, route handler, action) as one structured line — hook a provider here. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // Same guard as register(): keeps the Node-only logger out of the Edge instrumentation bundle.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { logger } = await import('./server/logger');
  const headers = request.headers as Record<string, string | string[] | undefined>;
  logger.error('request failed', {
    error,
    digest:
      typeof error === 'object' && error !== null && 'digest' in error
        ? String(error.digest)
        : undefined,
    method: request.method,
    path: request.path,
    requestId: headers['x-request-id'],
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
