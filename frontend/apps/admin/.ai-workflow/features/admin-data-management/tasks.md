# Tasks: Admin auth & data management (mock data)

- **Feature:** admin-data-management · **Requirement:** ./requirement.md (Approved 2026-10-16)
- **Status:** Approved <!-- Draft → Approved (only after explicit user approval) -->
- **Approved by / date:** user, 2026-10-16 ("duyệt")

## Overview

| ID   | Title                                                               | Target          | Depends on                   |
| ---- | ------------------------------------------------------------------- | --------------- | ---------------------------- |
| T-01 | UI form primitives: `Input`, `Textarea`, `Select`, `Field`          | @frontend/ui    | —                            |
| T-02 | UI overlays & data display: `Dialog`, `ConfirmDialog`, `Table`      | @frontend/ui    | —                            |
| T-03 | UI feedback: `Toast`, `ToastProvider`, `useToast`                   | @frontend/ui    | —                            |
| T-04 | Mock store, seed fixtures, shared zod schemas, week utils (+ tests) | @frontend/admin | —                            |
| T-05 | Mock auth: env, scrypt + JWT session, `/api/auth/*` handlers        | @frontend/admin | T-04                         |
| T-06 | Mock admin API: daily-metrics, weeks bulk upsert, events            | @frontend/admin | T-05                         |
| T-07 | Login page, `proxy.ts` guard, authed layout (sidebar, user, logout) | @frontend/admin | T-01, T-03, T-05             |
| T-08 | Weekly Data page: week picker, 7-day form, totals, save             | @frontend/admin | T-01, T-03, T-06, T-07       |
| T-09 | Events page: list by week, add/edit dialog, delete confirm          | @frontend/admin | T-01, T-02, T-03, T-06, T-07 |
| T-10 | E2E suite, data reset, docs                                         | @frontend/admin | T-08, T-09                   |

**Architecture**, applying requirement decisions Q2, Q3, Q5 and Q7:

```
src/
  proxy.ts                                  cookie-presence guard → /login
  app/
    api/auth/{login,logout,me}/route.ts      mock §1.2 auth
    api/admin/daily-metrics/route.ts, [id]/route.ts
    api/admin/weeks/[weekStart]/route.ts
    api/admin/events/route.ts, [id]/route.ts
    login/page.tsx
    (dashboard)/layout.tsx · page.tsx (Weekly Data) · events/page.tsx · loading.tsx · error.tsx
  mocks/                                     server-only mock backend
    fixtures/seed.json                       committed seed (§1.1)
    store.ts                                 JSON file store (.mock-data/db.json, git-ignored), read per request
    auth.ts                                  scrypt hash/verify, JWT sign/verify, session cookie
    http.ts                                  json/error helpers, withSession() wrapper
  schemas/                                   zod schemas shared by forms and the mock (Q7)
  lib/week.ts                                Monday math, ISO dates
  features/
    auth/                                    login-form, logout-button
    weekly-data/                             week-picker, weekly-metrics-form
    events/                                  events-table, event-form-dialog
```

Client components call `api` (`NEXT_PUBLIC_API_URL`, which in dev points at the admin's own Route Handlers). Server Components forward the session cookie when they call `api`. Swapping to the real backend means changing env only (AC-2).

**Cross-feature dependency:** CI needs per-app env. That is handled by `apps/client` → revenue-trend-dashboard **T-09** (CI copies each `apps/*/.env.example`). This plan only makes sure the admin's `.env.example` is complete (T-05).

---

## T-01 — UI form primitives

- **Target:** @frontend/ui (the shared package, by requirement decision Q6)
- **Scope (allowed paths):**
  - `../../packages/ui/src/components/{input,textarea,select,field}/**`
  - `../../packages/ui/src/index.ts`
- **Depends on:** —
- **Dependencies to add:** none
- **Affected consumers:** `@frontend/client`, `@frontend/admin`
- **Acceptance criteria:**
  - [ ] `Input`, `Textarea` and `Select` are styled with the semantic tokens (`border-border`, `bg-surface`, `rounded-control`, focus ring). They support `aria-invalid` styling and spread native props.
  - [ ] `Field` takes `label`, an optional `hint` and an optional `error`, and a render-prop child that receives `{ id, 'aria-invalid', 'aria-describedby' }`. The label is linked to the control, and the error is announced (`role="alert"`). This covers AC-13 and AC-19.
  - [ ] Each primitive has its own folder with `.tsx`, `.stories.tsx` and `index.ts`. `field.test.tsx` checks the label link, the error and the ARIA wiring.
- **Verify:**
  - `pnpm --filter @frontend/ui test`
  - `pnpm turbo run lint typecheck build --filter=...@frontend/ui`
  - `pnpm build-storybook`
- **Commit:** `feat(ui): add input, textarea, select and field primitives`

## T-02 — UI overlays & data display

- **Target:** @frontend/ui
- **Scope (allowed paths):**
  - `../../packages/ui/src/components/{dialog,table}/**`
  - `../../packages/ui/src/index.ts`
- **Depends on:** —
- **Dependencies to add:** none
- **Affected consumers:** `@frontend/client`, `@frontend/admin`
- **Acceptance criteria:**
  - [ ] `Dialog` is built on native `<dialog>` with `showModal()`, so it gets focus containment, Escape and backdrop for free.
    - It is controlled with `open` / `onOpenChange`, through `useControllableState`.
    - It has the parts `DialogTitle`, `DialogDescription` and `DialogFooter`, and is labelled with `aria-labelledby`.
  - [ ] `ConfirmDialog` is a ready-made confirm/cancel dialog. It has a destructive variant and a `loading` state on confirm (AC-20).
  - [ ] `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead` and `TableCell` are styled semantic table parts that scroll horizontally on small screens.
  - [ ] Stories cover each component. `dialog.test.tsx` checks open/close, Escape → `onOpenChange(false)` and the accessible name.
- **Verify:**
  - `pnpm --filter @frontend/ui test`
  - `pnpm turbo run lint typecheck build --filter=...@frontend/ui`
  - `pnpm build-storybook`
- **Commit:** `feat(ui): add dialog, confirm dialog and table`

## T-03 — UI feedback: toast

- **Target:** @frontend/ui
- **Scope (allowed paths):**
  - `../../packages/ui/src/components/toast/**`
  - `../../packages/ui/src/index.ts`
- **Depends on:** —
- **Dependencies to add:** none, because it is written in-house (Q6)
- **Affected consumers:** `@frontend/client`, `@frontend/admin`
- **Acceptance criteria:**
  - [ ] `ToastProvider` renders a fixed `aria-live="polite"` region.
  - [ ] `useToast()` returns `toast({ title, description?, tone: 'success' | 'error' | 'neutral' })` and `dismiss(id)`.
  - [ ] Toasts auto-dismiss after about 4s (paused on hover/focus), can be closed manually, and stack. Error toasts use `role="alert"`. This covers AC-14 and AC-20.
  - [ ] Calling `useToast` outside the provider throws a clear error.
  - [ ] There is a story. `toast.test.tsx` covers show, auto-dismiss (fake timers) and manual close.
- **Verify:**
  - `pnpm --filter @frontend/ui test`
  - `pnpm turbo run lint typecheck build --filter=...@frontend/ui`
  - `pnpm build-storybook`
- **Commit:** `feat(ui): add toast provider and useToast hook`

## T-04 — Mock store, seed, schemas, week utils

- **Target:** @frontend/admin
- **Scope (allowed paths):**
  - `src/mocks/{fixtures/**,store.ts,store.test.ts}`
  - `src/schemas/**`
  - `src/lib/week.ts` and `week.test.ts`
  - `.gitignore` (app-level, `.mock-data/`)
  - `vitest.config.ts`
  - `package.json` (devDependency, `test` and `mock:reset` scripts)
  - `../../pnpm-lock.yaml`
- **Depends on:** —
- **Dependencies to add:** `vitest` (dev, `catalog:`), for unit tests of the store, schemas and week math. These are pure logic that E2E can't cover cheaply.
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] `fixtures/seed.json` follows the §1.1 shape. It holds 2 weeks (2026-10-05 and 2026-10-12) with the video numbers, plus events (Fri NEGATIVE, Sat POSITIVE). The admin user itself is seeded from env in T-05 (AC-1).
  - [ ] `store.ts`:
    - reads and writes `.mock-data/db.json`, creating it from the seed when missing;
    - reads on every call, so deleting the file resets the data;
    - writes atomically (temp file + rename);
    - exposes typed operations: list/get/create/update/delete for metrics and events, and `upsertWeek` (AC-3).
  - [ ] `pnpm mock:reset` deletes `.mock-data/` (AC-3).
  - [ ] `schemas/` holds zod schemas for login, a daily metric (numbers ≥ 0, revenue ≤ 2 decimals, covers an integer), a week upsert (exactly 7 consecutive days starting on `weekStart`) and an event (title 1–120 characters). They are shared by the mock and the forms (AC-13, AC-19, Q7).
  - [ ] `week.ts` provides `startOfWeek` (Monday), `addWeeks`, `weekDays`, `isMonday` and `parseIsoDate`, all timezone-safe because they use UTC dates only.
  - [ ] Unit tests cover the store CRUD and upsert, the schema edge cases and the week math.
- **Verify:**
  - `pnpm --filter @frontend/admin test`
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
- **Commit:** `feat(admin): add mock data store, seed and shared schemas`

## T-05 — Mock auth

- **Target:** @frontend/admin
- **Scope (allowed paths):**
  - `src/mocks/{auth.ts,auth.test.ts,http.ts}`
  - `src/app/api/auth/**`
  - `src/env.ts`
  - `.env.example`
  - `.env` (local)
  - `package.json`
  - `../../pnpm-lock.yaml`
  - `../../pnpm-workspace.yaml` (catalog entry)
  - `e2e/api-auth.spec.ts`
- **Depends on:** T-04
- **Dependencies to add:** `jose` (catalog). It signs and verifies the HS256 session JWT and works in both the Node and Edge runtimes (Q5).
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] Server env (zod):
    - `AUTH_SECRET` (≥ 32 chars);
    - `ADMIN_EMAIL`;
    - `ADMIN_PASSWORD`;
    - optional `MOCK_DELAY_MS`.

    `.env.example` documents `admin@example.com` / `admin123` and sets `NEXT_PUBLIC_API_URL=http://localhost:3001` (AC-9, Q2).

  - [ ] The password is hashed with `crypto.scrypt` (random salt) and compared with `timingSafeEqual`. The plain password is never persisted (AC-9).
  - [ ] Endpoints:
    - `POST /api/auth/login` validates the body; on success it sets the httpOnly `SameSite=Lax` cookie (1 day, `Secure` in production) and returns `{ user }`;
    - bad credentials return `401 { error: 'Invalid credentials' }`;
    - `POST /api/auth/logout` clears the cookie;
    - `GET /api/auth/me` returns `200 { user }` or `401` (AC-4, AC-6).
  - [ ] `withSession(handler)` verifies the JWT and returns `401` otherwise, for use by T-06.
  - [ ] Unit tests cover hash/verify and JWT sign/verify/expiry. The E2E API spec covers login 200/401, `me` and logout.
- **Verify:**
  - `pnpm --filter @frontend/admin test`
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e -- e2e/api-auth.spec.ts`
- **Commit:** `feat(admin): add mock auth api with signed session cookie`

## T-06 — Mock admin API

- **Target:** @frontend/admin
- **Scope (allowed paths):**
  - `src/app/api/admin/**`
  - `src/mocks/http.ts`
  - `e2e/api-admin.spec.ts`
- **Depends on:** T-05
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] Every handler is wrapped in `withSession` → `401` without a session (AC-4).
  - [ ] Daily metrics:
    - `GET /api/admin/daily-metrics?from=&to=`;
    - `POST` → `409` on a duplicate date;
    - `PUT /:id` and `DELETE /:id` → `404` for an unknown id.
  - [ ] `PUT /api/admin/weeks/:weekStart` → `400` if the week doesn't start on a Monday or the body is invalid. Otherwise it upserts 7 days and returns them.
  - [ ] Events: `GET ?from=&to=`, `POST`, `PUT /:id` and `DELETE /:id`, with `400` / `404` as specified.
  - [ ] Validation failures return `400 { error, details }`, where `details` is zod's flattened field errors (AC-4, AC-13).
  - [ ] Responses are `Cache-Control: no-store`, and `MOCK_DELAY_MS` is honoured.
  - [ ] The E2E API spec covers 401, 400, 404, 409 and the happy paths.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e -- e2e/api-admin.spec.ts`
- **Commit:** `feat(admin): add mock admin api for metrics, weeks and events`

## T-07 — Login, guard, authed layout

- **Target:** @frontend/admin
- **Scope (allowed paths):**
  - `src/proxy.ts`
  - `src/app/login/**`
  - `src/app/(dashboard)/{layout,loading,error}.tsx`
  - `src/app/layout.tsx` (ToastProvider)
  - `src/app/page.tsx` (moved into `(dashboard)`)
  - `src/features/auth/**`
  - `src/lib/{session,api}.ts`
  - `e2e/{auth,smoke}.spec.ts`
- **Depends on:** T-01, T-03, T-05
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] `proxy.ts`:
    - redirects requests without the session cookie to `/login?next=<path>`;
    - redirects `/login` to `/` when the cookie exists;
    - excludes `/api`, `_next` and static files from the matcher (AC-7).
  - [ ] `/login`:
    - the `LoginForm` (`'use client'`) uses `Field` + `Input` and zod validation;
    - it shows "Invalid credentials" on a 401 and a busy state while submitting;
    - on success it goes to `next` or `/` (AC-5, AC-6).
  - [ ] The `(dashboard)` layout (Server Component) loads the user with `/api/auth/me`, forwarding the cookie. A 401 redirects to `/login`. It renders the sidebar (Weekly Data, Events, with the active state), the user name and a `LogoutButton` (AC-8, AC-10).
  - [ ] A client-side 401 helper redirects to `/login` (AC-10).
  - [ ] The E2E auth spec covers: signed-out → redirect, wrong password → error, login → `/`, logout → `/login`.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e`
  - Runtime (next-dev-loop): `/` redirects to `/login`; after login the sidebar and user name show; `get_errors` is clean.
- **Commit:** `feat(admin): add login, route guard and authenticated layout`

## T-08 — Weekly Data page

- **Target:** @frontend/admin
- **Scope (allowed paths):**
  - `src/app/(dashboard)/page.tsx`
  - `src/features/weekly-data/**`
  - `src/features/week-picker/**`
  - `e2e/weekly-data.spec.ts`
- **Depends on:** T-01, T-03, T-06, T-07
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] `WeekPicker` (shared by Weekly Data and Events) puts `?weekStart=` in the URL, with ← / → and a date input that snaps to Monday. The default is the current week (AC-11).
  - [ ] The page (Server Component) loads the week's metrics and passes them to `WeeklyMetricsForm` (`'use client'`). The form is a 7-row `Table` (day + date) with `Input`s for POS, Eatclub, Labour and Covers; missing days are 0 (AC-12).
  - [ ] Validation uses the shared schema per field, and maps 400 `details` from the API onto the fields. Save is disabled while there are errors (AC-13).
  - [ ] **Save week** → `PUT /api/admin/weeks/:weekStart`, with a busy state and a success/error toast (AC-14).
  - [ ] Live totals (revenue, covers) are formatted with `formatCurrency` and `formatNumber` (AC-15).
  - [ ] "View dashboard for this week" links to `${env.NEXT_PUBLIC_CLIENT_URL}/?weekStart=…` (AC-16).
  - [ ] Unsaved changes trigger a confirm on week change and `beforeunload` (AC-17).
  - [ ] The E2E spec edits a value, saves, sees a toast, reloads, and sees the value persisted. It also covers a negative value → field error.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e`
  - Runtime (next-dev-loop): `/?weekStart=2026-10-12` shows the seeded values, the totals are $15,974 and 871, and saving works.
- **Commit:** `feat(admin): add weekly data editor`

## T-09 — Events page

- **Target:** @frontend/admin
- **Scope (allowed paths):**
  - `src/app/(dashboard)/events/**`
  - `src/features/events/**`
  - `e2e/events.spec.ts`
- **Depends on:** T-01, T-02, T-03, T-06, T-07
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] `/events` shows a `WeekPicker` and an events `Table` with date, impact badge (`IconBadge` + label), title and description, or an empty state (AC-18).
  - [ ] Add and Edit open an `EventFormDialog` with:
    - date (defaults to the selected week, any date allowed — Q4);
    - impact `Select`;
    - title (required, ≤ 120 characters);
    - description `Textarea`.

    Validation is per field, from the shared schema and the API `details` (AC-19).

  - [ ] Delete → `ConfirmDialog` (destructive) → `DELETE`, with a toast. The list refreshes with `router.refresh()` and no full reload (AC-20).
  - [ ] The E2E spec covers add → appears, edit → updated, delete → confirm → gone.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e`
  - Runtime (next-dev-loop): `/events?weekStart=2026-10-12` lists the Fri and Sat events, and add/edit/delete work.
- **Commit:** `feat(admin): add event impacts management`

## T-10 — E2E suite, data reset, docs

- **Target:** @frontend/admin
- **Scope (allowed paths):**
  - `e2e/**`
  - `playwright.config.ts`
  - `CLAUDE.md` (app)
- **Depends on:** T-08, T-09
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] A Playwright `globalSetup` resets the mock data (deletes `.mock-data/db.json`) before each run, so the specs start from the seed and don't depend on each other.
  - [ ] The full suite covers AC-23 and passes both with `pnpm test:e2e` and with `CI=1` (production build).
  - [ ] The app `CLAUDE.md` documents the mock (where the data lives, `mock:reset`, default credentials, and how to switch to the real backend).
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/admin`
  - `pnpm test:e2e`
  - `pnpm build`, then `CI=1 pnpm test:e2e`
- **Commit:** `test(admin): complete e2e coverage and document the mock backend`
