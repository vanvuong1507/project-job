import type { Instrumentation } from 'next';

/** Runs once per server instance. Logs the effective (non-secret) configuration. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { logger } = await import('./server/logger');
  logger.info('server started', {
    nodeEnv: process.env.NODE_ENV,
    dataSource: process.env.DATA_SOURCE ?? 'mock',
    mockApi: process.env.ENABLE_MOCK_API === 'true',
  });
}

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
