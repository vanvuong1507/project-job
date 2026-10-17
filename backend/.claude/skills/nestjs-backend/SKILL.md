---
name: nestjs-backend
description: Project conventions for this NestJS 12 (ESM) + TypeORM 1 + PostgreSQL backend — folder layout, zod DTOs that validate + document (Swagger) + test, AppException/ErrorCode error shape, DTO mapping and response headers, config via APP_CONFIG, @Auth RBAC, ESM imports, Vitest + real-DB e2e. Use whenever implementing or reviewing backend code here. Overrides the generic nestjs-best-practices skill where they differ.
---

# NestJS conventions (this backend)

These rules win over `nestjs-best-practices` when they conflict; that skill stays the reference for general patterns (DI, module boundaries, N+1, transactions, guards). Human-facing detail: `docs/ARCHITECTURE.md`, `docs/API.md`.

## Runtime & imports

- NestJS 12 is **ESM-only** (`"type": "module"`, `module: nodenext`). Relative imports end in `.js`.
- **Never `import type` a class that is constructor-injected** — decorator metadata needs the runtime value. Pure types may use `import type`.

## Layout

```
src/bootstrap/        configure-app.ts (pipeline, shared with e2e) · logger.ts · swagger.ts
src/config/           env.ts · app-config.ts (APP_CONFIG) · config.module.ts
src/common/           constants/ exceptions/ filters/ http/ middleware/ pipes/ swagger/ utils/ validation/
src/database/         typeorm.config.ts · data-source.ts · migrations/ · seeds/ · scripts/ · utils/
src/modules/<name>/   <name>.module.ts · <name>.controller.ts (or controllers/) · <name>.service.ts (+ services/)
                      dto/<x>.dto.ts · entities/<x>.entity.ts · guards/ decorators/ utils/ types/ when needed
test/e2e/*.e2e-spec.ts · test/utils/
```

- `common/` never imports from `modules/`. A module uses other modules' **exported services**, never their repositories.
- Pure calculations go in plain functions with unit specs (e.g. `modules/dashboard/revenue-trend.builder.ts`).

## Config

- Runtime: `@Inject(APP_CONFIG) config: AppConfig` (or `loadAppConfig()` in scripts). New variable → zod schema + mapping in `config/app-config.ts`, `.env.example` (commented), `docs/SETUP.md` table, `app-config.spec.ts`.
- Seed-only variables live in `database/seeds/seed-config.ts`. Never read `process.env` elsewhere.

## DTOs (zod) — one schema, three jobs

In `modules/<m>/dto/<x>.dto.ts`, define input **and** response schemas:

1. Validate: `@Body(new ZodValidationPipe(schema))`, `@Query(...)`, `@Param('id', new ZodValidationPipe(uuidSchema, 'id'))`.
2. Document: `@ApiZodBody(schema)`, `@ApiZodQuery(schema)`, `@ApiZodParam(name, schema)`, `@ApiZodResponse(status, schema, description)`, `@ApiErrorResponses(400, 404, …)`, plus `@ApiTags`/`@ApiOperation`.
3. Test: e2e asserts `responseSchema.strict().parse(body)`.

Reuse `common/validation/schemas.ts` (`isoDateSchema`, `weekStartSchema`, `moneySchema`, `coversSchema`, `uuidSchema`, `timestampSchema`, `dateRangeQuerySchema`, `errorResponseSchema`). Messages match the admin app's client-side schemas; never let a default zod message reach the API. Add `.meta({ description, example })` for Swagger.

## Responses

- **Success:** bare resource or array (no envelope — the frontend contract). Map entities explicitly (`toXResponse(entity)` in the dto file; ISO strings for timestamps) — never return an entity.
- Lists: `setTotalCount(response, n)`. Creates: `201` + `setLocation(response, 'admin/<resource>', id)`. Deletes/logout: `@HttpCode(204)`. Use `@Res({ passthrough: true })` for headers.
- **Errors:** throw `new AppException(HttpStatus.X, ErrorCode.Y, 'Human message', details?)`. Add new codes to `common/exceptions/error-codes.ts` and to the table in `docs/API.md`. `HttpExceptionFilter` renders `{ statusCode, code, error, details?, requestId, path, timestamp }` for everything (Nest exceptions, router 404, body-parser, Postgres unique/check violations, unknown errors → 500 without internals). The frontend reads `error` + `details`: never rename or remove them.
- 429 with a wait: `TooManyRequestsException(code, message, retryAfterSeconds)` → `Retry-After`.

## Auth

- `@Auth()` (signed in) or `@Auth('metrics:write')` (permission) on each protected route — applies `SessionGuard`, the permission, Swagger security and 401/403 docs. Get the user with `@CurrentUser()`.
- Token from `admin_session` cookie or `Authorization: Bearer`; role re-read from the DB. Permissions in `modules/auth/permissions.ts` (mirror of the admin app's).
- Passwords via `modules/auth/utils/password.ts` (bcrypt). Never return `passwordHash`.

## Data access

- `@InjectRepository(Entity)`. TypeORM 1.x **throws on `undefined` in `where`** — use `dateWhere()` or omit keys.
- `date` = `YYYY-MM-DD` string; `numeric` → `numericTransformer`. Multi-row writes in `manager.transaction`; idempotent writes with `upsert` + `conflictPaths`.
- Schema changes only via migrations — see `typeorm-migrations`.

## Testing & done

- Unit: `src/**/*.spec.ts`. E2E: `test/e2e/` with `createTestApp()`, `t.reset()`, `t.login('VIEWER')`, `expectError(status, code, message, details?)`.
- Cover success, 400, 401, 403 and 404/409 for every new endpoint; update the path list in `platform.e2e-spec.ts`.
- Done = `pnpm check` and `pnpm test:e2e` pass.
