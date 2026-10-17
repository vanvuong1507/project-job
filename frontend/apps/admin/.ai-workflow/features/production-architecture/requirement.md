# Requirement: Production-grade App Router architecture, RBAC (admin)

- **Slug:** production-architecture
- **Status:** Approved <!-- Draft → Approved (set only after explicit user approval) -->
- **Approved by / date:** user, 2026-10-16 ("duyệt")
- **Source:**
  - User request (2026-10-16): review `apps/`; refactor to current Next.js / App Router standards; add production config; evaluate zustand and React Query; add i18n, theme switching, interceptors, roles/permissions and the other standard production setup.
  - Bundled Next 16.4 docs: `authentication.md`, `data-security.md`, `backend-for-frontend.md`, `forms.md`, `getting-started/07-mutating-data.md`, `production-checklist.md`, `functions/forbidden.md` (experimental).
- **Targets:** @frontend/admin, plus the shared packages also listed in `apps/client` → production-architecture: `@frontend/api-client` interceptors, the theme tokens and toggle, and the new `@frontend/i18n`.

## Goal

Keep every admin behaviour (admin-data-management, AC-1…AC-23), but rebuild it on the documented App Router patterns:

- a `server-only` Data Access Layer with `verifySession()`;
- Server Actions for every mutation;
- role-based access control enforced on the server.

Add i18n, light/dark/system themes and the production setup shared with the client.

## Review findings (current code)

| #   | Finding                                                                                                                                                                                         | Evidence                                                                                            | Standard                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | **Server Components call the app's own Route Handlers over HTTP**: `/api/auth/me` in the layout and the login page, and `/api/admin/*` in pages, through `serverGet()` with a forwarded cookie. | `features/auth/get-current-user.ts`, `lib/server-api.ts`, `(dashboard)/page.tsx`, `events/page.tsx` | backend-for-frontend.md: _"do not call Route Handlers from Server Components"_.                                                                   |
| A2  | **Mutations are client `fetch` calls to Route Handlers followed by `router.refresh()`.** Validation, auth and the error mapping are re-implemented per form, and forms don't work without JS.   | `weekly-metrics-form.tsx`, `event-form-dialog.tsx`, `events-manager.tsx`, `login-form.tsx`          | forms.md and mutating-data.md: **Server Actions** with server-side validation, `useActionState` and `revalidatePath`.                             |
| A3  | **The auth check is spread out and not reusable for authorization.** There is no DAL `verifySession()` (React `cache`), and no `server-only`.                                                   | `features/auth`, `mocks/http.ts`                                                                    | authentication.md → _Creating a Data Access Layer_; data-security.md.                                                                             |
| A4  | **No roles or permissions.** Every signed-in user can do everything, and the session holds only the user id.                                                                                    | `mocks/auth.ts`, `mocks/store.ts`                                                                   | authentication.md → _Authorization_: the role goes in the session for optimistic checks, and secure checks happen in the DAL and in every action. |
| A5  | **Login has no rate limiting.** There is no lockout or backoff.                                                                                                                                 | `api/auth/login/route.ts`                                                                           | production-checklist.md (Security): rate limiting.                                                                                                |
| A6  | **Mocks and Route Handlers ship in production with no gate.** Domain logic (store) and transport are mixed in `src/mocks`.                                                                      | `src/mocks/**`, `src/app/api/**`                                                                    | —                                                                                                                                                 |
| A7  | **Large client components mix state, data calls, validation and UI** (WeeklyMetricsForm is about 280 lines).                                                                                    | `features/weekly-data`                                                                              | Thin client islands. Data and actions belong on the server.                                                                                       |
| A8  | **Missing production files**: `global-error.tsx`, `instrumentation.ts`, a health endpoint, a CSP, standalone output. **No i18n or theme.**                                                      | `src/app`                                                                                           | production-checklist.md                                                                                                                           |

## Project structure (answer to "is `features/` correct App Router?")

Per `01-getting-started/02-project-structure.md`, Next.js is **unopinionated**. "Store project files outside of `app`" (where `app` is routing only) is one of the documented strategies, so `src/features/` is valid. The requirement is to **pick one strategy and apply it consistently**, which the current code doesn't do (see the findings). The rules adopted for both apps:

```
src/
  app/[locale]/                      routing only: layout, page, loading, error, not-found, route groups
    (<area>)/<route>/_components/    private folder: UI used by this route only (colocated)
  features/<domain>/                 a domain module reused across routes; public API via index.ts
    components/                      server components plus small 'use client' islands
    actions.ts                       'use server' mutations (admin)
    schemas.ts                       zod schemas shared by actions and forms
  server/                            import 'server-only': DAL, data sources, session/authz, logger
  components/                        app-wide UI (shell, providers, locale/theme switchers)
  lib/                               pure, isomorphic helpers (no env, no I/O)
  i18n/                              next-intl routing, request config, messages/{en,vi}.json
```

- `server/` is the only place that reads secret env vars or touches data sources. Components never import from `mocks/` or `server/*/sources/*` directly.
- A file under `features/` must not import from `app/`. Route `_components` may import from `features/`, `components/` and `lib/`, but not from each other's routes.

Admin mapping:

- `features/auth` (login form, logout button, `actions.ts`), `features/metrics` (weekly form, `actions.ts`, `schemas.ts`) and `features/events` (table, dialog, `actions.ts`, `schemas.ts`).
- `features/week-picker` moves to `components/week-picker`, because it is shared UI, not a domain.
- `components/app-shell` stays.
- `features/auth/get-current-user.ts` and `lib/server-api.ts` are replaced by `server/session.ts` and `server/authz.ts`.
- `mocks/` becomes `server/sources/mock/`.
- Routes:
  - `app/[locale]/(auth)/login`;
  - `app/[locale]/(dashboard)/{page,events/page,forbidden/page}`;
  - the mock API stays under `app/api`, outside `[locale]`.

## State management evaluation (requested: zustand, React Query)

Inventory of the state these apps actually hold:

| State                              | Where it lives today        | Correct home in App Router                                    |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------- |
| Dashboard data, admin lists, user  | fetched (badly, see review) | **Server**: RSC reads through the DAL; no client cache needed |
| Mutations (save week, CRUD events) | client `fetch` + `refresh`  | **Server Actions** + `useActionState` + `revalidatePath`      |
| Compare mode, visible series, week | `useState` / URL            | **URL search params** (shareable, SSR-correct, back button)   |
| Form drafts, dialogs, toasts       | local `useState` / context  | stays local (already correct)                                 |
| Theme, locale                      | —                           | `next-themes` (cookie/localStorage) and the i18n routing      |
| Sidebar collapsed, UI preferences  | —                           | small, persisted, cross-tree → the only zustand candidate     |

- **React Query: not recommended.** Its value is client-side caching, background refetch, polling, infinite queries and optimistic cache updates. Here every read is a Server Component and every write is a Server Action. React's `useOptimistic` covers the optimistic UI. Adding it would create a second cache that has to be kept in sync with the router cache. Revisit it if a screen needs polling or live client-side filtering.
- **zustand: not needed now.** No server state belongs in it, and the URL / local state cover everything else. If persisted UI preferences (for example a collapsed sidebar) appear, one small `zustand/persist` store is acceptable. It must be created **per request via a provider**, not as a module singleton, to stay safe with RSC and SSR.

The week picker already keeps its state in the URL (correct). Optimistic UI for event CRUD, if wanted, uses React `useOptimistic` rather than a client cache.

## Acceptance criteria

**Architecture**

- [ ] AC-1: The code follows the project structure rules above, with ESLint `no-restricted-imports` boundaries as in the client. Layout:
  - `src/app` is routing only;
  - `src/features/<feature>/` holds the components and Server Actions (`actions.ts`, `'use server'`);
  - `src/server/` holds the server-only DAL (`session.ts`, `authz.ts`, `metrics.ts`, `events.ts`, `users.ts`), each with `import 'server-only'` and returning DTOs (no password hashes or raw records).
- [ ] AC-2: No Server Component calls a Route Handler. Pages and layouts read data through DAL functions.
- [ ] AC-3: The data source is chosen by server env `DATA_SOURCE=mock|api` behind repository interfaces:
  - `mock`: today's file-backed store, unchanged behaviour and seed;
  - `api`: the real backend via `@frontend/api-client` at `API_URL`, with the session token forwarded by an interceptor.
- [ ] AC-4: The mock Route Handlers (`/api/auth/*`, `/api/admin/*`, the §1.2 JSON contract) remain for tools and E2E API tests, served from the same DAL. They return 404 unless `ENABLE_MOCK_API=true`.
- [ ] AC-5: Mutations are Server Actions:
  - login, logout, save week, create/update/delete event;
  - each validates with the shared zod schemas on the server, calls `verifySession()` and `requirePermission()`, and returns a typed `ActionState` (`{ ok, message, fieldErrors }`);
  - each calls `revalidatePath`.

  Forms use `useActionState`, with pending UI and toasts. Login and the event form work without JavaScript (progressive enhancement).

**Auth & RBAC**

- [ ] AC-6: Roles (user decision): `ADMIN` has full access; `VIEWER` is read-only.
- [ ] AC-7: Permissions are a typed map (`metrics:read`, `metrics:write`, `events:read`, `events:write`, `events:delete`), with one `can(role, permission)` shared by server and UI.
- [ ] AC-8: Seeded users: one per role, from env (default passwords documented in `.env.example`, hashed on seed). The session JWT carries `sub` and `role`.
- [ ] AC-9: Three layers of checks:
  - **Optimistic.** `proxy.ts` reads and verifies the session cookie (no DB). Without one it redirects to `/login?next=`. If the role lacks the route's permission it redirects to `/forbidden`.
  - **Secure.** The DAL `verifySession()` is cached per request. `requirePermission()` runs in every page, action and handler. Unauthenticated → `/login`, forbidden → `/forbidden`. This uses stable APIs, not the experimental `forbidden()`.
  - **UI.** Controls the role can't use are hidden or disabled. For example, a VIEWER sees read-only inputs and no Save, Add, Edit or Delete.
- [ ] AC-10: A forbidden action returns `403` from the API and an error `ActionState` from an action, and is logged. There is an E2E test per role (the viewer can't save or change events; the admin can do everything).
- [ ] AC-11: Login rate limiting:
  - at most 5 failed attempts per email+IP within 15 minutes, then `429` with `Retry-After`;
  - the UI shows "Too many attempts";
  - in-memory for the mock, behind an interface.
- [ ] AC-12: Sessions:
  - the cookie is httpOnly, `SameSite=Lax`, `Secure` in production, 1 day;
  - logout deletes it;
  - a stale or invalid cookie never loops (the existing E2E test is kept).

**i18n & theme** (same as the client, AC-7…AC-11 there)

- [ ] AC-13: `en` / `vi` with a `[locale]` segment, and a locale switcher in the header. Every string comes from typed catalogs, including validation messages: zod issues map to message keys on both the server and the client. Dates, numbers and currency are formatted per locale.
- [ ] AC-14: Light, dark and system themes via `next-themes`, with dark tokens and the toggle in the header.

**Production setup** (same as the client, AC-12…AC-15 there)

- [ ] AC-15: The `@frontend/api-client` interceptors are used by the `api` data source:
  - request id;
  - `Authorization: Bearer <session token>`;
  - `Accept-Language`;
  - 401 → sign out.
- [ ] AC-16: `global-error.tsx`, per-segment `error`, `loading` and `not-found`; a `/forbidden` page; `instrumentation.ts` with a structured logger (request id, user id, action name); a complete, validated `.env.example`.
- [ ] AC-17: Unit tests cover the permission map and `can()`, the rate limiter, action validation mapping, the DAL authz guards and the i18n catalog completeness.
- [ ] AC-18: Every existing E2E spec passes, updated for locale prefixes, plus the new RBAC, rate-limit, locale and theme specs. `pnpm check` and `pnpm test:e2e` (dev and `CI=1`) pass.

## Out of scope

- A real backend, real user management UI (creating users or changing roles), password reset, MFA.
- React Query and zustand (see the evaluation above).
- **Deferred by the user (2026-10-16):** Docker / `standalone` / health endpoint, CSP, git hooks + commitlint, Renovate.
- An auth library (Auth.js / Better Auth). The DAL is shaped so one can replace the mock session later (see Q3).

## Decisions (user, 2026-10-16)

- **Q1 → next-intl, `en` (default) + `vi`.**
- **Q2 → `ADMIN` + `VIEWER` only.** `VIEWER` has `metrics:read` and `events:read`; `ADMIN` has every permission.
- **Q3 → keep the hand-rolled JWT session behind the DAL.** This is the recommendation; the backend owns auth per spec.
- **Q4 → dark theme yes.** CSP, Docker and tooling are deferred.
- **Project structure →** the rules above.
