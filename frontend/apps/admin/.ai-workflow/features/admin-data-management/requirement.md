# Requirement: Admin auth & data management (mock data)

- **Slug:** admin-data-management
- **Status:** Approved <!-- Draft → Approved (set only after explicit user approval) -->
- **Approved by / date:** user, 2026-10-16 ("approval"; open questions resolved with the recommended options)
- **Source:**
  - User request (2026-10-16): implement the task detail for each app, mock the data inside each app (no backend yet), return JSON from the mock, and follow Next.js architecture and clean code.
  - `../../../docs/US-TASK-DETAIL.md`, EPIC 2 (US-08 – US-10), plus the auth and admin endpoints in §1.2 and the data model in §1.1.
- **Targets:** @frontend/admin. Probably also `@frontend/ui` for form primitives; Q6 decides.

## Goal

The admin signs in, enters or edits the 7 daily metrics of any week, and manages the event impacts that the dashboard marks on its chart.

There is no backend yet. Auth and data are served by a **mock owned by `apps/admin`**, which speaks the §1.2 contract in JSON. Moving to the real backend later must be a configuration change, not a component change.

## Context / existing code

- `src/app/page.tsx` is a placeholder. `layout.tsx` (Inter font, `noindex`), `error.tsx` and `not-found.tsx` exist.
- `src/env.ts` (t3/zod) has `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CLIENT_URL` and an optional `API_INTERNAL_URL`.
- `src/lib/api.ts` is `createHttpClient(..., { withCredentials: true })`. `ApiError` carries `status` and `details` (for the 400 `{ error, details }` shape).
- `@frontend/api-client` has the DTOs `AdminUser`, `DailyMetric`, `EventImpact`, `DayMetrics` and `ImpactType`. It has no request-body DTOs yet.
- `@frontend/ui` has `Button` (with `loading`), `Card*`, `Skeleton`, `IconBadge`, the icons, `formatCurrency` / `formatNumber`, and `useControllableState`.
  - It has **no** text input, select, textarea, form field (label + error), dialog/modal, table or toast.
- The admin `CLAUDE.md` describes these conventions:
  - routes `/login`, `/` (weekly data) and `/events`;
  - a `src/proxy.ts` cookie guard (the Next 16 name for middleware);
  - a 401 redirects to `/login`;
  - field errors come from `ApiError.details`;
  - "View dashboard" links use `NEXT_PUBLIC_CLIENT_URL`.
- No screenshots exist for the admin. Its UI follows the same design tokens and components as the dashboard.

## Acceptance criteria

**Mock (data source)**

- [ ] AC-1: The mock lives entirely inside `apps/admin`:
  - committed JSON seed fixtures (§1.1): 1 admin user, at least 2 weeks of daily metrics with the same numbers as the video, and events (Fri NEGATIVE, Sat POSITIVE);
  - JSON over HTTP that follows the §1.2 paths and shapes for `/api/auth/*`, `/api/admin/daily-metrics`, `/api/admin/weeks/:weekStart` and `/api/admin/events`.
- [ ] AC-2: Pointing the app at a real backend later needs only env changes. No component, page or form code changes.
- [ ] AC-3: Changes persist across page reloads for the whole dev session. Seed data can be restored with one documented command.
- [ ] AC-4: The mock behaves like the spec'd backend:
  - it validates bodies with zod and answers `400 { error, details }` on failure;
  - creating a daily metric for a date that already exists returns `409`;
  - every `/api/admin/*` call without a valid session returns `401`;
  - unknown ids return `404`.

**Auth (US-08)**

- [ ] AC-5: `/login` has an email + password form with client-side validation (required, valid email). Wrong credentials show "Invalid credentials". The submit button shows a busy state.
- [ ] AC-6: A successful login redirects to `/`, or back to the originally requested page. The session is an httpOnly cookie with `SameSite=Lax` and a 1-day expiry.
- [ ] AC-7: Any page other than `/login` redirects to `/login` without a session (enforced by `src/proxy.ts`). Opening `/login` while signed in redirects to `/`.
- [ ] AC-8: The authed layout has a header with the user's name and a **Logout** button, which clears the session and returns to `/login`. Sidebar navigation: **Weekly Data** (`/`) and **Events** (`/events`).
- [ ] AC-9: The default admin credentials come from env, documented in `.env.example`. The password is never stored or compared in plain text in the mock.
- [ ] AC-10: Any `401` from the API while signed in sends the user back to `/login`.

**Weekly data (US-09)**

- [ ] AC-11: `/` has a week picker. The week is always a Monday, with ← previous week, → next week and a date input. The week is stored in the URL (`?weekStart=YYYY-MM-DD`). With no week given, the current week is selected.
- [ ] AC-12: A table of 7 rows (Mon–Sun with dates) has inputs for POS Revenue, Eatclub Revenue, Labour Cost and Covers. Rows load from the week's existing metrics; missing days start empty or 0.
- [ ] AC-13: Validation:
  - every number is ≥ 0;
  - revenue and labour allow at most 2 decimals;
  - covers must be an integer.

  Errors show per field, both from the client and from the mock's `400 details`. While errors exist, the user can't save.

- [ ] AC-14: **Save week** upserts all 7 days with `PUT /api/admin/weeks/:weekStart`. A toast reports success or failure, and the button shows a busy state while saving.
- [ ] AC-15: Below the table, the week's Total revenue (POS + Eatclub) and Total covers update live as you type.
- [ ] AC-16: A "View dashboard for this week" link opens `${NEXT_PUBLIC_CLIENT_URL}/?weekStart=<week>`.
- [ ] AC-17: If you navigate away from a week with unsaved changes, the app asks for confirmation.

**Events (US-10)**

- [ ] AC-18: `/events` lists the events of the selected week (same week picker), showing date, impact badge (Positive / Negative with the event icons), title and description. If there are none, it shows an empty state.
- [ ] AC-19: **Add** and **Edit** open a modal form with these fields:
  - date (required, and must fall within the selected week, or any date — see Q4);
  - impact (Positive / Negative);
  - title (required, ≤ 120 characters);
  - description (optional).

  Validation errors show per field. The modal can be closed with Escape and keeps focus inside it while open.

- [ ] AC-20: **Delete** asks for confirmation before removing an event. Success and failure are reported with toasts, and the list updates without a full reload.

**Quality**

- [ ] AC-21: Pages are Server Components where possible, and only the forms and interactive parts are client components. Every page has loading and error states.
- [ ] AC-22: `pnpm turbo run lint typecheck build --filter=@frontend/admin` passes. If `@frontend/ui` changes, `--filter=...@frontend/ui` (which includes the client), `pnpm --filter @frontend/ui test` and `pnpm build-storybook` pass too.
- [ ] AC-23: Playwright E2E covers:
  - redirect to login when signed out;
  - wrong password → error;
  - login → `/`;
  - edit a day and save → value persists after reload;
  - add, edit and delete an event;
  - logout.

## Out of scope

- Real backend, database, migrations.
- Registration, password reset, multiple roles.
- Anything in `apps/client`, including making the client dashboard reflect admin edits while each app has its own mock. See Q1.
- CSV import, multi-restaurant data.

## Open questions

- **Q1. Sync with the client dashboard.** The spec expects admin edits to show on the dashboard. With a mock in each app, as you asked, the admin's changes stay inside the admin's mock.
  - **(a)** Accept this until the real backend exists. _(recommended, matches "mock riêng cho từng app")_
  - **(b)** Make both mocks share one JSON data file outside the apps (shared, not per-app).
- **Q2. How the mock is served.** Recommended: Next.js **Route Handlers** in `src/app/api/...` that implement the §1.2 endpoints, with `NEXT_PUBLIC_API_URL` pointing at the admin itself in dev (`http://localhost:3001`).
  - The session cookie is then first-party, so `src/proxy.ts` can read it.
  - Components keep using `api`. Moving to the real backend is an env change, although cookie domains need checking at that point.
- **Q3. Persistence of mock writes.**
  - **(a)** A JSON file under a git-ignored folder in the app, created from the committed seed, plus a `mock:reset` script. _(recommended: survives dev-server restarts)_
  - **(b)** In-memory only, which resets whenever the server restarts.
- **Q4. Event date rule.** Must an event's date fall within the currently selected week, or can it be any date (with the list filtered by week)? Recommended: any date. The form defaults to the selected week.
- **Q5. Session token.** Recommended: an HMAC-signed token (JWT via `jose`, with the secret in env `AUTH_SECRET`), with `proxy.ts` checking that the cookie exists and the API verifying it. Default credentials in `.env.example`: `admin@example.com` / `admin123`, with the password hashed by Node `crypto.scrypt`. Is that OK, and are new deps acceptable?
- **Q6. New UI primitives.** The forms need `Input`, `Select`, `Textarea`, `Field` (label + error), `Dialog` (native `<dialog>`), `Toast` and a simple `Table`.
  - Put the generic ones in `@frontend/ui`, with stories and tests, so the client can reuse them later? _(recommended)_
  - For toasts, use the `sonner` library, or a small one written in-house? Recommended: in-house `Toast` + `useToast` in `@frontend/ui`, to avoid a dependency.
- **Q7. Forms: Server Actions or client fetch?** To keep the "same JSON API as the future backend" goal (Q2), the recommendation is client components that call `api` (fetch to the Route Handlers), with zod schemas shared between the form and the mock. Server Actions would bypass the HTTP contract.

## Decisions (resolved open questions)

- **Q1 → (a):** Admin edits stay in the admin's own mock until the real backend exists.
- **Q2 → Route Handlers:** `src/app/api/...` implements the §1.2 auth and admin endpoints. `NEXT_PUBLIC_API_URL` points to the admin itself in dev (`http://localhost:3001`), so the session cookie is first-party.
- **Q3 → (a):** Writes persist to a git-ignored JSON file created from the committed seed, plus a `mock:reset` script.
- **Q4 → Any date:** an event can have any date; the list is filtered by the selected week, and the form defaults to that week.
- **Q5 → JWT:** a JWT (`jose`, HS256) signed with `AUTH_SECRET`, in an httpOnly cookie. The password is hashed with Node `crypto.scrypt`. Default credentials in `.env.example`: `admin@example.com` / `admin123`. `proxy.ts` checks only that the cookie exists; the API verifies it.
- **Q6 → `@frontend/ui`:** generic primitives (`Input`, `Select`, `Textarea`, `Field`, `Dialog`, `Toast` + `useToast`, `Table`) go into `@frontend/ui`, with stories and tests. Toast is written in-house, with no dependency.
- **Q7 → Client fetch:** forms are client components calling `api` against the Route Handlers. zod schemas are shared between the forms and the mock.
