# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

Backend for a take-home test (`../yeu-cau.md`): a REST API that serves the "Revenue Trend" dashboard and lets an admin edit the data behind it. Spec (data model §1.1, API contract §1.2, EPIC 3) in `../docs/US-TASK-DETAIL.md`. The frontend is a separate project in `../frontend` (same git repo, independent package and CI) (Next.js: `apps/client` :3000, `apps/admin` :3001); its DTOs in `../frontend/packages/api-client/src/types/` are the contract this API must honour. Human docs: `README.md` and `docs/` (SETUP, ARCHITECTURE, API, DATABASE, DEPLOYMENT, CONTRIBUTING).

Stack: **NestJS 12 (ESM-only) · TypeORM 1.x · PostgreSQL 16 · zod 4 · @nestjs/swagger · jose · bcryptjs · Vitest + supertest · oxlint · pnpm**. No Docker.

## Commands

Node 24 (`.nvmrc`), `corepack enable` for pnpm 10.

```bash
pnpm bootstrap               # install → .env (if missing) → db:create → db:migrate → db:seed
pnpm doctor              # environment check with fixes
pnpm dev                 # http://localhost:4000/api · Swagger /api/docs
pnpm check               # format:check + lint + typecheck + unit tests + build (= CI)
pnpm test                # unit; one file: pnpm test src/modules/dashboard/revenue-trend.builder.spec.ts
pnpm test:e2e            # e2e on <db>_test (auto-created); one: pnpm test:e2e test/e2e/auth.e2e-spec.ts -t "logout"
pnpm db:migrate | db:revert | db:seed [--users-only] | db:reset
pnpm migration:generate <Name>   # | migration:create <Name> | migration:check  (scripts/migration.mjs; auto-registers in migrations/index.ts)
```

`db:*`, `migration:generate` and `migration:check` build first and run compiled JS from `dist/` (decorator metadata needs tsc output).

## Architecture

```
src/main.ts · app.module.ts
src/bootstrap/   configure-app.ts (HTTP pipeline, shared with e2e) · logger.ts · swagger.ts
src/config/      env.ts (readEnv) · app-config.ts (runtime AppConfig, APP_CONFIG token) · config.module.ts
src/common/      constants/ exceptions/ (AppException, ErrorCode) filters/ http/ middleware/ pipes/ swagger/ utils/ validation/
src/database/    typeorm.config.ts · data-source.ts (CLI) · migrations/ · seeds/ · scripts/ (db:*) · utils/
src/modules/     auth · metrics · events · dashboard · health   (module/controller/service + dto/ entities/ …)
test/e2e/ · test/utils/   ·   scripts/ (doctor, sync-skills)   ·   docs/
```

- **Dependency direction:** `bootstrap → modules → common`; `common` never imports `modules`. Modules use other modules' exported services only.
- **Config:** runtime env in `config/app-config.ts` (validated, with production guards, e.g. the example `JWT_SECRET` is refused); seed-only env (`ADMIN_*`, `VIEWER_*`) in `database/seeds/seed-config.ts`. Never read `process.env` elsewhere.
- **Responses (backward compatible with the frontend):**
  - success = bare resource / array (no envelope); entities are always mapped to DTOs (`toDailyMetricResponse`, `toEventImpactResponse`); lists set `X-Total-Count`; 201 sets `Location`; 204 for deletes/logout.
  - errors = `{ statusCode, code, error, details?, requestId, path, timestamp }`, built only by `HttpExceptionFilter`. Throw `AppException(status, ErrorCode.X, message)`; add new codes to `common/exceptions/error-codes.ts` **and** to the frontend mirror `../frontend/packages/api-client/src/types/errors.ts` (the frontend branches on `code`, maps `401/403/404/409/429/VALIDATION_FAILED` to domain errors, and its mock Route Handlers copy this body). Never rename fields.
- **Validation & docs:** zod schemas in `modules/<m>/dto/*.dto.ts` validate input (`ZodValidationPipe`), generate Swagger (`ApiZodBody/Query/Param/Response`, `ApiErrorResponses`) and are asserted in e2e (`schema.strict().parse(body)`). Response schemas live next to input schemas.
- **Auth & RBAC:** short-lived HS256 access JWT (`sub`, `role`, `sid`; 15 min) in the httpOnly `admin_session` cookie or `Authorization: Bearer`, plus a rotating refresh token (`admin_refresh`, path `/api/auth`; `<sid>.<generation>.<HMAC>`, only the generation is stored in `auth_sessions`). `POST /api/auth/refresh` rotates; replaying an older generation (after `REFRESH_REUSE_LEEWAY_SECONDS`) revokes the session (`REFRESH_TOKEN_REUSED`); logout revokes it; every request checks the session is active (`SessionsService`). `@Auth('metrics:write')` = `SessionGuard` (401/403) + Swagger security. The role is re-read from the DB on each request. `modules/auth/permissions.ts` mirrors `../frontend/apps/admin/src/lib/permissions.ts`; `JWT_SECRET` must equal the admin app's `AUTH_SECRET`. Login: per-IP throttle + lockout per email+IP (`LOGIN_LOCKED`, `Retry-After`). The admin app calls the API server-side and forwards the user's IP in `X-Forwarded-For`, so `TRUST_PROXY` must trust the admin server (default `loopback`).
- **Database:** single TypeORM config `database/typeorm.config.ts`; entities and migrations listed explicitly (ESM, no globs); `synchronize` off. `date` stays `YYYY-MM-DD`, `numeric` → number.
- **Seed:** 2 accounts matching the frontend — admin (`ADMIN`) and client (`VIEWER`, read-only) — + 2 demo weeks ($15,974 vs $14,982). Idempotent; production allows `--users-only` with non-example passwords only.
- **Observability:** `X-Request-Id` per request; one access-log line per request; JSON logs in production (`LOG_FORMAT`, `LOG_LEVEL`); 5xx logged with stack + request id; `/api/health/live`, `/api/health/ready`.

## Gotchas

- **ESM:** relative imports end in `.js`.
- **DI + `import type`:** never type-import a constructor-injected class (metadata erased → runtime DI failure). `consistent-type-imports` is off for this reason.
- **TypeORM 1.x throws on `undefined` in `where`** — use `database/utils/date-where.ts` or omit keys.
- **zod:** use `{ abort: true }` when later refinements make no sense after a failure (see `isoDateSchema`); give every schema a friendly message so no default zod text reaches API errors.
- **Comments:** don't put globs like `src/**/*.ts` in `/** */` blocks (`*/` ends the comment).
- **Swagger:** a new route needs `@ApiTags`, `@ApiOperation`, `@ApiZod*`, `@ApiErrorResponses`; `test/e2e/platform.e2e-spec.ts` lists every documented path — update it.

## AI workflow

Entry point `/workflow <phase> …` (`.claude/commands/workflow.md`); state in `.ai-workflow/features/<slug>/`; guide `.ai-workflow/README.md`.

| Phase                          | Subagent     | Skills                                                                                                              | Gate                                |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| analyze: request → requirement | `analyst`    | `requirement-analysis`, `api-contract`                                                                              | user approves the requirement       |
| plan: requirement → tasks      | `planner`    | `task-planning`                                                                                                     | user approves the plan              |
| implement: one task at a time  | `developer`  | `nestjs-backend`, `typeorm-migrations`, `api-contract`, `nestjs-best-practices`, `supabase-postgres-best-practices` | `pnpm check` + `pnpm test:e2e` pass |
| review                         | `reviewer`   | `nestjs-best-practices`, `supabase-postgres-best-practices`                                                         | PASS                                |
| commit                         | main session | —                                                                                                                   | user confirms files and message     |

- No feature code until `requirement.md` and `tasks.md` say `Status: Approved` (only the user approves).
- Project skills win over the vendored generic ones (zod vs class-validator, `APP_CONFIG` vs `@nestjs/config`). Vendored skills are pinned by `scripts/sync-skills.mjs`; never edit them. Ignore Supabase-only parts (RLS with `auth.uid()`).
- Contract changes that affect the frontend become follow-ups for the frontend's own workflow; this workflow never edits `../frontend`. Verify the integration with the frontend's Playwright suite against this API (`../frontend/README.md` → "E2E trên backend thật").
- Questions and one-line fixes may skip the workflow; Git rules still apply.

## Git safety & commits

- Run `git status --short` first; files already modified belong to the user — never stage, revert or stash them.
- Stage by name only. Never `git add -A`/`.`, `commit -a`, `reset --hard`, `clean`, `restore`, `stash`, `--no-verify` (denied in `.claude/settings.json`).
- Commit only on request (after the reviewer's PASS in the workflow). Never push unless asked.
- Conventional Commits `type(scope): summary` (imperative, lowercase, < 72 chars), footer `Refs: <slug> T-xx`. Scopes: `auth`, `metrics`, `events`, `dashboard`, `health`, `database`, `config`, `common`, `repo`.
- Never run `pnpm db:reset`/`db:revert` on the dev DB without asking. `.env` is unreadable by the agent; use `.env.example`.
