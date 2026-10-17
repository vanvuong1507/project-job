@AGENTS.md

# apps/admin

`@frontend/admin` is the admin UI, on port 3001.

- Spec: `../../../docs/US-TASK-DETAIL.md` EPIC 2 (US-08 – US-10).
- Endpoints: §1.2 `/api/auth/*` and `/api/admin/*`.

## App context

- **Routes.** Everything sits under `app/[locale]/`, with English at `/` and Vietnamese at `/vi`:
  - `(auth)/login` is public;
  - `(dashboard)/` holds Weekly Data at `/`, plus `/events` and `/forbidden`.

  The app is mounted at its own root, not under `/admin` as the spec assumes. The mock JSON API stays at `app/api/**`, outside `[locale]`.

- **Structure.** This follows "Project structure" in `.ai-workflow/features/production-architecture/requirement.md`, and ESLint `no-restricted-imports` enforces the boundaries.
  - `server/` (`import 'server-only'`) holds the DAL:
    - `session.ts`: cookie, `verifySession` with React `cache`;
    - `users.ts`: `getCurrentUser`, `signIn`, `signOut`;
    - `metrics.ts`, `events.ts`;
    - `authz.ts`: `requireUser`, `requirePermission`, `authorize`;
    - `rate-limit.ts`, `client-ip.ts`;
    - `data-source.ts`, plus `sources/{mock,api}` behind the `repositories.ts` interfaces;
    - `http/route-helpers.ts` for the mock API;
    - `logger.ts`, which deliberately has no `server-only` because `instrumentation.ts` uses it.
  - `features/<domain>/` (`auth`, `metrics`, `events`) each hold `actions.ts` (`'use server'`), `schemas.ts` (zod), `components/` and, for metrics, `lib/` (pure helpers with tests).
  - `components/` holds the app shell (nav), week picker, locale switcher, theme toggle and providers.
  - `lib/` holds `permissions` (RBAC, isomorphic), `action-state`, `validation`, `week` (locale-aware labels), `redirects` and `session` (cookie name).
  - `i18n/` holds `routing`, `navigation`, `request`, `global`, `use-message` and `messages/{en,vi}.json`.
- **Data and mutations.**
  - Pages are Server Components that call the DAL directly; never this app's own Route Handlers.
  - Mutations are Server Actions. Each one calls `authorize(permission)`, validates with the zod schema on the server, calls the DAL and then `revalidatePath`, and returns an `ActionState`.
  - `ActionState.message` and the zod messages are **i18n keys** (`validation.*`, `auth.*`); forms translate them with `useMessage`.
  - `DATA_SOURCE=mock|api` selects the repositories:
    - `mock`: the file store `.mock-data/db.json`, created from `server/sources/mock/fixtures/seed.json` and read on every request. Run `pnpm mock:reset` to start over; E2E resets it in `e2e/global-setup.ts`.
    - `api`: the backend at `API_URL`, with a request id, `X-Forwarded-For`, `Authorization: Bearer <session>` and GET retries. In this mode `AUTH_SECRET` must equal the backend's `JWT_SECRET`.
  - Both sources raise the domain errors of `server/errors.ts` (each with the backend `code`). Actions turn them into an `ActionState` with `actionErrorFor()` (`server/action-errors.ts`); the mock Route Handlers turn them into the backend's error body (`server/http/route-helpers.ts`).
- **Auth and RBAC.** The roles are `ADMIN` (every permission) and `VIEWER` (`metrics:read`, `events:read`). Checks happen in three layers:
  1. **Optimistic:** `proxy.ts` decodes the role from the cookie (no DB). No session → localized `/login?next=`; a role without the route's permission → `/forbidden`.
  2. **Secure:** `requirePermission` in every page, and `authorize` in every action and handler (401/403).
  3. **UI:** controls the role can't use are hidden or read-only.

  More details:
  - Seeded accounts: `admin@example.com` / `admin123` and `viewer@example.com` / `viewer123`. Passwords are hashed with scrypt.
  - **Session = 2 httpOnly cookies** (contract in `lib/session.ts`, same as the backend): `admin_session`, a short-lived access token (HS256 JWT `{ sub, role, sid }`, 15 min), and `admin_refresh`, a rotating refresh token (7 days sliding, 30 days max). Lifetimes come from the issuer (backend `Set-Cookie` Max-Age, or the mock's defaults).
  - **Refresh happens in `proxy.ts`**, before pages and Server Actions run (Server Components can't set cookies): when the access token is missing or expires within 60 s and a refresh token exists, it calls `repositories.auth.refresh`, sets the new cookies on the response AND on the request (so this render already uses them). A rejected refresh token (`INVALID_REFRESH_TOKEN`, `REFRESH_TOKEN_REUSED`) clears both cookies → `/login`; a backend outage keeps them. Pure helpers in `server/auth/session-cookies.ts` (no `next/headers`).
  - Logout (`signOut`) revokes the session (backend or mock store), then clears both cookies. `getCurrentUser` checks the session is still active (`repositories.auth.currentUser`).
  - Mock mode mirrors the backend rules in `sources/mock/store.ts` (`sessions`: rotation, 30 s reuse leeway, reuse → revoke, sliding + absolute expiry) and the token format in `server/auth/refresh-token.ts` (a unit test pins it to the backend's output).
  - Login is a Server Action that works without JS. It is rate-limited to 5 failures per email+IP per 15 minutes (`429`/message), and the email is kept after a failure.

- **i18n.** Use next-intl, as in the client. `request.ts` uses next-intl's `requestLocale`, not `next/root-params`: root params throw inside Server Actions and Route Handlers in Next 16.4, which broke logout. Redirects inside the app use `@/i18n/navigation` with `getLocale()`.
- **Theme.** `next-themes` (Light / Dark / System) via semantic tokens. The modal scrim uses the `overlay` token.
- **Observability.** `instrumentation.ts` logs startup and, through `onRequestError`, structured lines for server errors. Actions log their name, user and outcome, including denied cases. `LOG_LEVEL` sets the threshold.
- **Dashboard links.** "View dashboard" links use `env.NEXT_PUBLIC_CLIENT_URL`.
- **Hydration.** Format dates with `lib/week.ts` (Intl weekday, day and month, verified identical in Node and the browser). Never use `Intl.DateTimeFormat#formatRange`, because Node's ICU emits U+2009 where browsers emit spaces.

## Commands (from this folder)

- `pnpm dev` → http://localhost:3001
- `pnpm turbo run lint typecheck build --filter=@frontend/admin`
- `pnpm test` (Vitest: store, schemas, tokens, permissions, rate limiter, action state, metrics form, week, catalogs) · `pnpm mock:reset`
- `pnpm test:e2e` (Playwright, specs in `e2e/`); one test: `pnpm test:e2e -- e2e/smoke.spec.ts -g "<title>"`; `pnpm test:e2e:ui` for the UI mode

## Next.js agent tooling

These are the official tools from the [Next.js AI agents guide](https://nextjs.org/docs/app/guides/ai-agents).

- **Version-matched docs.** `AGENTS.md`, imported above, is managed by `next dev` (`agentRules`). It points to `node_modules/next/dist/docs/`. Read those docs before relying on memory for any Next.js API. Commit `AGENTS.md` as `next dev` writes it, and don't hand-edit its managed block.
- **MCP.** `.mcp.json` registers `next-devtools-mcp`, so while `pnpm dev` runs you get `nextjs_index` and `nextjs_call` against `/_next/mcp`. Useful tools include `get_errors`, `get_routes`, `get_compilation_issues` and `compile_route`. Claude Code asks you to approve the project MCP server the first time.
- **Skills** in `.claude/skills/` are vendored verbatim from `vercel/next.js`, pinned in `../../scripts/sync-next-skills.mjs`. Never edit them; re-run the script to update them.
  - `next-dev-loop` checks the change at runtime against a running `pnpm dev`, through `/_next/mcp` plus a real browser. It requires the `agent-browser` CLI ≥ 0.31.1 (`npm i -g agent-browser`). This app runs on 3001, so export `NEXT_MCP_URL=http://localhost:3001/_next/mcp` before the skill probes `/_next/mcp`.
  - `next-bundle-optimizer` audits the client bundle with `next analyze`. It defaults to audit-only mode and changes code only when you explicitly ask.
- **Not vendored:** `next-cache-components-*` and `next-partial-prefetching-*` are for apps with Cache Components enabled, which this app doesn't use yet. Add them to the sync script if you adopt that feature.

## AI workflow (this app only)

Run Claude Code from `apps/admin`, so that this app's `.claude/` loads. The root `../../CLAUDE.md` also loads automatically; it holds the monorepo rules (commands, package impact, Git safety).

The entry point is `/workflow <phase> …`, defined in `.claude/commands/workflow.md`. State lives in `.ai-workflow/features/<slug>/` (`requirement.md`, `tasks.md`, `progress.md`, built from `.ai-workflow/templates/`). The usage guide is `.ai-workflow/README.md`.

| Phase                                          | Subagent     | Skill                                                   | Gate                            |
| ---------------------------------------------- | ------------ | ------------------------------------------------------- | ------------------------------- |
| analyze: request and screenshots → requirement | `analyst`    | `requirement-analysis`                                  | user approves the requirement   |
| plan: requirement → tasks                      | `planner`    | `task-planning`                                         | user approves the plan          |
| implement: one task at a time                  | `developer`  | `nextjs-frontend`, `ui-implementation`, `next-dev-loop` | verify commands pass            |
| review                                         | `reviewer`   | —                                                       | PASS                            |
| commit                                         | main session | —                                                       | user confirms files and message |

- **Approval.** No feature code is written until both `requirement.md` and `tasks.md` say `Status: Approved`. Only the user approves, either with `/workflow approve …` or explicitly in words.
- **Scope.** A task edits only its Scope: this app, or `../../packages/*` when the plan says so. Never `../client/`.
- **Shared packages.** Changing one affects `@frontend/client` too, so verify with `--filter=...@frontend/<pkg>`.
- **Small requests.** Questions and one-line fixes may skip the workflow. The Git rules still apply.
