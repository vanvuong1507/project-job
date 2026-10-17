import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { SWAGGER_PATH } from '../common/constants/app.constants.js';
import { BEARER_AUTH, COOKIE_AUTH, SESSION_COOKIE } from '../modules/auth/auth.constants.js';

/** package.json `version` — resolved from src/ (tests) and dist/ (build) alike. */
function packageVersion(): string {
  const raw = readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  return (JSON.parse(raw) as { version: string }).version;
}

/**
 * Swagger UI at `/api/docs`, OpenAPI JSON at `/api/docs-json`.
 * Schemas come from the zod validators (see common/swagger/zod-openapi.ts).
 * "Try it out" works with the session cookie (log in first) or by pasting the token as Bearer.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Revenue Dashboard API')
    .setDescription(
      [
        'REST API for the Revenue Trend dashboard and its admin.',
        '',
        '**Auth:** `POST /api/auth/login` sets the httpOnly `admin_session` cookie; calls from a server can send the same JWT as `Authorization: Bearer <token>`.',
        '**Roles:** `ADMIN` — everything · `VIEWER` (client account) — read-only, writes answer `403`.',
        '**Errors:** always `{ "error": string, "details"?: { "<field.path>": string[] } }`.',
      ].join('\n'),
    )
    .setVersion(packageVersion())
    .addCookieAuth(
      SESSION_COOKIE,
      { type: 'apiKey', in: 'cookie', name: SESSION_COOKIE },
      COOKIE_AUTH,
    )
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, BEARER_AUTH)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    customSiteTitle: 'Revenue Dashboard API',
    jsonDocumentUrl: `${SWAGGER_PATH}-json`,
    swaggerOptions: { persistAuthorization: true, withCredentials: true, tagsSorter: 'alpha' },
  });
}
