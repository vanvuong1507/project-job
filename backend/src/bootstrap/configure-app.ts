import type { INestApplication, LoggerService } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { API_PREFIX, REQUEST_ID_HEADER } from '../common/constants/app.constants.js';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter.js';
import { TOTAL_COUNT_HEADER } from '../common/http/response-headers.js';
import { bodyParserErrors } from '../common/middleware/body-parser-errors.middleware.js';
import { requestContext } from '../common/middleware/request-context.middleware.js';
import type { AppConfig } from '../config/app-config.js';
import { setupSwagger } from './swagger.js';

/**
 * The HTTP pipeline, shared by `main.ts` and the e2e tests (so tests exercise the real setup).
 * Order matters: CORS first, so even early error responses (bad JSON) carry CORS headers.
 */
export function configureApp(
  app: INestApplication,
  config: AppConfig,
  logger: LoggerService,
): void {
  const http = app as NestExpressApplication;
  http.disable('x-powered-by');
  http.set('trust proxy', config.trustProxy);
  http.set('etag', false); // responses are `no-store`; ETags would only cost CPU

  app.enableCors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Accept-Language',
      'Authorization',
      REQUEST_ID_HEADER,
    ],
    exposedHeaders: [REQUEST_ID_HEADER, 'Retry-After', 'Location', TOTAL_COUNT_HEADER],
    maxAge: 600,
  });
  app.use(
    helmet({
      // Over plain-HTTP localhost these would make some browsers (Safari) refuse the Swagger UI assets.
      hsts: config.isProduction,
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: config.isProduction ? [] : null },
      },
    }),
  );
  app.use(cookieParser());
  app.use(requestContext(logger, { json: config.log.json }));
  http.useBodyParser('json', { limit: '100kb' });
  app.use(bodyParserErrors);

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  if (config.swagger.enabled) setupSwagger(app);
}
