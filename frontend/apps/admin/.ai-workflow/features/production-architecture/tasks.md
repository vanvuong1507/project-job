# Tasks: Production-grade App Router architecture, RBAC (admin)

- **Feature:** production-architecture · **Requirement:** ./requirement.md (Approved 2026-10-16)
- **Status:** Approved <!-- Draft → Approved (only after explicit user approval) -->
- **Approved by / date:** user, 2026-10-16 ("duyệt")

## Overview

| ID   | Title                                                                                                  | Target          | Depends on                    |
| ---- | ------------------------------------------------------------------------------------------------------ | --------------- | ----------------------------- |
| T-01 | Server DAL: `server-only`, repositories with `mock`/`api` sources, session, gated mock API, boundaries | @frontend/admin | client T-01                   |
| T-02 | RBAC: roles ADMIN/VIEWER, permissions, `can()`, role in session, guards, `/forbidden`, UI gating       | @frontend/admin | T-01                          |
| T-03 | Auth Server Actions: login/logout with `useActionState`, login rate limiting                           | @frontend/admin | T-02                          |
| T-04 | Metrics Server Action: save week; split the weekly form into server + client islands                   | @frontend/admin | T-02                          |
| T-05 | Events Server Actions: create/update/delete; dialog and table refactor                                 | @frontend/admin | T-02                          |
| T-06 | next-intl: `[locale]` routing, proxy (intl + auth), catalogs incl. validation messages, switcher       | @frontend/admin | client T-03, T-03, T-04, T-05 |
| T-07 | Theme: next-themes provider and toggle                                                                 | @frontend/admin | client T-02, T-06             |
| T-08 | Production files: `global-error`, segment states, metadata, instrumentation + logger                   | @frontend/admin | T-06                          |
| T-09 | E2E migration + RBAC/rate-limit/locale/theme specs, unit tests, docs and skills                        | @frontend/admin | T-07, T-08                    |

**Cross-feature dependencies:** these come from `apps/client` → production-architecture: **T-01** (api-client interceptors), **T-02** (dark tokens) and **T-03** (`@frontend/i18n`). They run before this plan.

### Target structure (requirement → Project structure)

```
src/
  app/
    [locale]/layout.tsx · not-found.tsx
    [locale]/(auth)/login/page.tsx
    [locale]/(dashboard)/layout.tsx · page.tsx · events/page.tsx · forbidden/page.tsx · loading.tsx · error.tsx
    api/{auth,admin}/**                   mock JSON API (gated by ENABLE_MOCK_API), built on the DAL
    global-error.tsx
  proxy.ts                                next-intl negotiation + optimistic auth/role redirects
  instrumentation.ts
  i18n/                                   routing.ts · request.ts · navigation.ts · messages/{en,vi}.json
  features/
    auth/      components/{login-form,logout-button}.tsx · actions.ts · schemas.ts
    metrics/   components/weekly-metrics-form/* · actions.ts · schemas.ts
    events/    components/{events-table,event-form-dialog,delete-event-button}.tsx · actions.ts · schemas.ts
  server/                                 'server-only'
    session.ts                            createSession / deleteSession / verifySession (cache)
    authz.ts                              requireUser / requirePermission → redirect /login | /forbidden
    permissions.ts                        (isomorphic, no secrets) roles → permissions, can()
    rate-limit.ts · logger.ts
    users.ts · metrics.ts · events.ts     DAL functions returning DTOs
    sources/{mock,api}/…                  repository implementations (mock = today's file store)
  components/                             app-shell/* · week-picker/* · providers · locale-switcher · theme-toggle
  lib/                                    week.ts · action-state.ts (isomorphic)
```

---

## T-01 — Server DAL, data sources, session, gated mock API

- **Target:** @frontend/admin
- **Scope (allowed paths):** `src/server/**`, `src/mocks/**` (moved into `src/server/sources/mock/`), `src/features/auth/get-current-user.ts` (removed), `src/lib/{server-api,api,session}.ts`, `src/app/(dashboard)/**`, `src/app/login/page.tsx`, `src/app/api/**`, `src/components/week-picker/**` (moved from `features/week-picker`), `src/features/**` (imports only), `src/env.ts`, `.env.example`, `.env`, `eslint.config.js`, `vitest.config.ts`, `package.json`, `../../pnpm-lock.yaml`, `e2e/{api-auth,api-admin}.spec.ts`
- **Depends on:** client T-01
- **Dependencies to add:** `server-only`
- **Affected consumers:** —
- **Acceptance criteria:** (AC-1…AC-4, AC-12)
  - [ ] `server/session.ts`:
    - `createSession(user)` and `deleteSession()` use `cookies()`;
    - `verifySession()` is wrapped in React `cache`, reads and verifies the JWT, and returns `{ userId, role }` or `null`.
  - [ ] `server/users.ts`, `metrics.ts` and `events.ts` return DTOs (no `passwordHash`), through repositories selected by `DATA_SOURCE` (`mock` | `api`).
  - [ ] The `api` sources use `createHttpClient` with interceptors (request id, `Authorization: Bearer <token>` from the session cookie, `Accept-Language`) and retry for GETs.
  - [ ] Pages and layouts call the DAL directly. `serverGet` and the self-HTTP `/api/auth/me` call are removed.
  - [ ] The mock Route Handlers keep the §1.2 contract but are thin adapters over the DAL. They return 404 unless `ENABLE_MOCK_API=true`.
  - [ ] `features/week-picker` moves to `components/week-picker`.
  - [ ] ESLint boundaries are the same as in client T-04.
  - [ ] `env.ts`: `DATA_SOURCE`, `API_URL` (required for `api`) and `ENABLE_MOCK_API`. `NEXT_PUBLIC_API_URL` is removed.
  - [ ] Existing unit and E2E tests pass, with the API E2E kept against the gated mock.
- **Verify:**
  - `pnpm test`
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e`
  - Runtime: `/` and `/events` render without any request to `/api/*` (MCP `get_errors` clean).
- **Commit:** `refactor(admin): move data access and session to a server-only DAL`

## T-02 — RBAC

- **Target:** @frontend/admin
- **Scope (allowed paths):** `src/server/{permissions,authz,session}.ts` + tests, `src/server/sources/mock/**` (seeded viewer, role in the record), `src/proxy.ts`, `src/app/(dashboard)/**` (guards, the `forbidden` page), `src/components/app-shell/**`, `src/features/{metrics,events}/components/**` (UI gating only), `src/env.ts`, `.env.example`, `.env`, `e2e/rbac.spec.ts`, `e2e/fixtures.ts`
- **Depends on:** T-01
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:** (AC-6…AC-10)
  - [ ] `ROLES = ['ADMIN', 'VIEWER']`, with `PERMISSIONS` `metrics:read|write` and `events:read|write|delete`. `ADMIN` has all of them; `VIEWER` has `*:read`. `can(role, permission)` is pure and isomorphic, with unit tests.
  - [ ] The session JWT carries `sub` and `role`. The seed has an admin and a viewer, from env `ADMIN_*` and `VIEWER_*`.
  - [ ] `requireUser()` redirects to `/login`. `requirePermission(p)` redirects to `/forbidden` on pages, returns a forbidden `ActionState` in actions, and returns `403` in mock handlers. Every page and handler calls them.
  - [ ] `proxy.ts`: no cookie → `/login?next=`. A cookie whose role lacks a route permission → `/forbidden` (optimistic; the role is decoded from the cookie).
  - [ ] UI: a VIEWER sees read-only inputs with no Save, Add, Edit or Delete; the forbidden page explains and links home.
  - [ ] E2E: a viewer sees the read-only UI; a viewer's direct mutation request gets `403`; an admin keeps full access.
- **Verify:**
  - `pnpm test`
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e`
- **Commit:** `feat(admin): add admin and viewer roles with server-enforced permissions`

## T-03 — Auth Server Actions + rate limiting

- **Target:** @frontend/admin
- **Scope (allowed paths):** `src/features/auth/**`, `src/server/rate-limit.ts` + test, `src/lib/action-state.ts`, `src/app/login/**` (or `[locale]/(auth)/login` after T-06), `src/app/api/auth/**` (rate limit on the mock handler too), `e2e/auth.spec.ts`
- **Depends on:** T-02
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:** (AC-5, AC-11, AC-12)
  - [ ] `loginAction(prev, formData)`:
    - validates with zod on the server;
    - is rate-limited at 5 failures per email+IP per 15 minutes → "Too many attempts, try again in N minutes";
    - sets the session and redirects to `next` (safe path).

    `logoutAction` deletes the session and redirects to `/login`.

  - [ ] `LoginForm` uses `useActionState`: pending state, field errors and a form error. It works without JavaScript (a plain `<form action>` post).
  - [ ] `ActionState<T>` type plus `fromZodError()` helper (isomorphic) in `lib/action-state.ts`.
  - [ ] The rate limiter (`InMemoryRateLimiter` behind an interface, with a sliding window) has unit tests.
  - [ ] E2E: wrong password, then lockout after 5 attempts; login and logout keep working; the stale-cookie no-loop test still passes.
- **Verify:**
  - `pnpm test`
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e`
- **Commit:** `feat(admin): handle login and logout with server actions and rate limiting`

## T-04 — Metrics Server Action, weekly form split

- **Target:** @frontend/admin
- **Scope (allowed paths):** `src/features/metrics/**` (from `features/weekly-data`), `src/app/(dashboard)/page.tsx`, `e2e/weekly-data.spec.ts`
- **Depends on:** T-02
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:** (AC-5, AC-9)
  - [ ] `saveWeekAction(weekStart, prev, formData)`: `requirePermission('metrics:write')`, server-side zod validation with field errors keyed `days.<i>.<field>`, the DAL upsert, then `revalidatePath`.
  - [ ] The form is split into a **server** page (data + permission), a `WeeklyMetricsForm` client island (inputs, live totals, dirty guard) and small presentational parts (table rows, totals footer). No file is longer than about 150 lines.
  - [ ] Behaviour is unchanged: validation messages, per-cell totals, unsaved-change guard, toast on save, and no horizontal overflow on mobile.
  - [ ] The existing weekly-data E2E specs pass.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e`
  - Runtime: saving a week shows the toast and the values persist after reload.
- **Commit:** `refactor(admin): save weekly metrics with a server action`

## T-05 — Events Server Actions

- **Target:** @frontend/admin
- **Scope (allowed paths):** `src/features/events/**`, `src/app/(dashboard)/events/**`, `e2e/events.spec.ts`
- **Depends on:** T-02
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:** (AC-5, AC-9)
  - [ ] `createEventAction`, `updateEventAction` and `deleteEventAction` call `requirePermission('events:write' | 'events:delete')`, validate on the server, call the DAL and then `revalidatePath('/events')`.
  - [ ] `EventFormDialog` uses `useActionState`. The events page is a server component that renders the table; the client islands are the dialog, the delete button with `ConfirmDialog`, and the add button.
  - [ ] Optional optimistic delete via `useOptimistic` (no client cache).
  - [ ] The existing events E2E specs pass.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e`
- **Commit:** `refactor(admin): manage events with server actions`

## T-06 — next-intl

- **Target:** @frontend/admin
- **Scope (allowed paths):** `src/app/**` (under `src/app/[locale]/`; the API stays at `src/app/api`), `src/i18n/**`, `src/proxy.ts` (compose intl + auth), `src/components/{app-shell,locale-switcher}/**`, `src/features/**` (copy), `src/lib/week.ts` (labels via the formatter), `src/features/*/schemas.ts` (message keys), `next.config.ts`, `package.json`, `../../pnpm-lock.yaml`, `src/i18n/messages.test.ts`
- **Depends on:** client T-03, T-03, T-04, T-05
- **Dependencies to add:** `next-intl` (catalog)
- **Affected consumers:** —
- **Acceptance criteria:** (AC-13)
  - [ ] Routing is the same as in the client: `en` (default, no prefix) and `vi` (`/vi`), with an invalid locale → `notFound`.
  - [ ] `proxy.ts` chains next-intl negotiation, then the auth/role checks (locale-aware redirects).
  - [ ] Every string is translated, including zod validation messages. Schemas emit **message keys**, which actions and forms translate. Dates and amounts are formatted per locale with deterministic output (no hydration mismatch).
  - [ ] The `LocaleSwitcher` in the header keeps the path and query. The catalog completeness test passes.
- **Verify:**
  - `pnpm test`
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e` (specs updated for copy/URLs)
- **Commit:** `feat(admin): add en/vi localisation with next-intl`

## T-07 — Theme

- **Target:** @frontend/admin
- **Scope (allowed paths):** `src/components/{providers,theme-toggle,app-shell}/**`, `src/app/[locale]/layout.tsx`, `src/i18n/messages/*.json`, `package.json`, `../../pnpm-lock.yaml`
- **Depends on:** client T-02, T-06
- **Dependencies to add:** `next-themes` (catalog)
- **Affected consumers:** —
- **Acceptance criteria:** (AC-14)
  - [ ] Same behaviour as client T-06: Light, Dark and System, with no flash and an accessible toggle in the app header. Forms, tables, dialogs and toasts are legible in dark.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e`
  - Runtime: light and dark screenshots of login, weekly data and events are reviewed.
- **Commit:** `feat(admin): add light, dark and system themes`

## T-08 — Production files

- **Target:** @frontend/admin
- **Scope (allowed paths):** `src/app/global-error.tsx`, `src/app/[locale]/**/{error,loading,not-found}.tsx`, `src/app/[locale]/layout.tsx` (metadata), `src/instrumentation.ts`, `src/server/logger.ts`, `src/app/icon.svg`
- **Depends on:** T-06
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:** (AC-16)
  - [ ] `global-error.tsx` uses `retry`.
  - [ ] Localized `error`, `loading` and `not-found` per segment.
  - [ ] Metadata with a title template, `robots: noindex` and an icon.
  - [ ] `instrumentation.ts` `onRequestError` logs `{ path, digest, requestId, userId? }`. Actions log their name, user and outcome, including forbidden and rate-limited cases.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - Runtime: a forced error logs a structured line.
- **Commit:** `feat(admin): add global error, segment states and instrumentation`

## T-09 — E2E migration, new specs, unit tests, docs

- **Target:** @frontend/admin
- **Scope (allowed paths):** `e2e/**`, `CLAUDE.md` (app), `.claude/skills/{nextjs-frontend,ui-implementation,task-planning}/SKILL.md`, `.ai-workflow/templates/task.md`
- **Depends on:** T-07, T-08
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:** (AC-17, AC-18)
  - [ ] All previous specs pass with locale-aware URLs.
  - [ ] New specs:
    - RBAC (viewer and admin);
    - the rate-limit lockout;
    - `/vi` copy plus translated validation messages;
    - the theme persists;
    - the forbidden page.
  - [ ] Unit tests cover the permissions, the rate limiter, the action-state mapping and catalog completeness.
  - [ ] The app `CLAUDE.md` and skills document the DAL, Server Actions, RBAC layers, i18n and theme.
  - [ ] `pnpm check` and `pnpm test:e2e` pass in dev and with `CI=1`.
- **Verify:**
  - `pnpm check`
  - `pnpm test:e2e`
  - `pnpm build && CI=1 pnpm test:e2e`
- **Commit:** `test(admin): cover rbac, rate limiting, locales and themes; document the architecture`
