# Progress: Admin auth & data management (mock data)

| Phase          | Status   | Date / note                                                             |
| -------------- | -------- | ----------------------------------------------------------------------- |
| Requirement    | Approved | 2026-10-16 — user approved; Qs resolved with recommended options        |
| Plan           | Approved | 2026-10-16 — user approved T-01…T-10                                    |
| Implementation | Done     | 2026-10-16 — T-01…T-10 PASS, not committed (awaiting your confirmation) |

## Pre-existing working-tree changes (not part of this feature)

Captured 2026-10-16, before implementation. All of the following were scaffold/infra changes from earlier sessions (initial scaffold staged, never committed):

```
    A  .editorconfig
    AM .gitignore
    AM .nvmrc
    AM .prettierignore
    AM .prettierrc.json
    A  .vscode/extensions.json
    A  .vscode/settings.json
    AM README.md
    AM apps/admin/.env.example
    A  apps/admin/eslint.config.js
    AM apps/admin/next.config.ts
    AM apps/admin/package.json
    A  apps/admin/postcss.config.mjs
    AM apps/admin/src/app/globals.css
    AM apps/admin/src/app/layout.tsx
    AM apps/admin/src/app/page.tsx
    AM apps/admin/src/lib/api.ts
    AD apps/admin/src/lib/env.ts
    A  apps/admin/tsconfig.json
    AM apps/client/.env.example
    A  apps/client/eslint.config.js
    AM apps/client/next.config.ts
    AM apps/client/package.json
    A  apps/client/postcss.config.mjs
    AM apps/client/src/app/globals.css
    AM apps/client/src/app/layout.tsx
    AM apps/client/src/app/page.tsx
    AM apps/client/src/lib/api.ts
    AD apps/client/src/lib/env.ts
    A  apps/client/tsconfig.json
    AM package.json
    A  packages/api-client/eslint.config.js
    AM packages/api-client/package.json
    AD packages/api-client/src/http.ts
    AM packages/api-client/src/index.ts
    AD packages/api-client/src/types.ts
    A  packages/api-client/tsconfig.json
    AM packages/eslint-config/base.js
    AM packages/eslint-config/next.js
    AM packages/eslint-config/package.json
    AM packages/eslint-config/react-library.js
    AM packages/tailwind-config/package.json
    A  packages/tailwind-config/postcss.config.mjs
    AM packages/tailwind-config/theme.css
    A  packages/typescript-config/base.json
    A  packages/typescript-config/nextjs.json
    A  packages/typescript-config/package.json
    A  packages/typescript-config/react-library.json
    A  packages/ui/eslint.config.js
    AM packages/ui/package.json
    AD packages/ui/src/components/button.tsx
    AD packages/ui/src/components/card.tsx
    AM packages/ui/src/index.ts
    A  packages/ui/src/lib/cn.ts
    AM packages/ui/tsconfig.json
    AM pnpm-lock.yaml
    AM pnpm-workspace.yaml
    AM turbo.json
    ?? .claude/
    ?? .github/
    ?? CLAUDE.md
    ?? apps/admin/.ai-workflow/
    ?? apps/admin/.claude/
    ?? apps/admin/.mcp.json
    ?? apps/admin/AGENTS.md
    ?? apps/admin/CLAUDE.md
    ?? apps/admin/e2e/
    ?? apps/admin/playwright.config.ts
    ?? apps/admin/src/app/error.tsx
    ?? apps/admin/src/app/not-found.tsx
    ?? apps/admin/src/env.ts
    ?? apps/client/.ai-workflow/
    ?? apps/client/.claude/
    ?? apps/client/.mcp.json
    ?? apps/client/AGENTS.md
    ?? apps/client/CLAUDE.md
    ?? apps/client/e2e/
    ?? apps/client/playwright.config.ts
    ?? apps/client/src/app/error.tsx
    ?? apps/client/src/app/not-found.tsx
    ?? apps/client/src/env.ts
    ?? packages/api-client/src/client.ts
    ?? packages/api-client/src/errors.ts
    ?? packages/api-client/src/types/
    ?? packages/eslint-config/shared.js
    ?? packages/next-config/
    ?? packages/playwright-config/
    ?? packages/tailwind-config/base.css
    ?? packages/ui/.storybook/
    ?? packages/ui/src/components/button/
    ?? packages/ui/src/components/card/
    ?? packages/ui/src/components/checkbox/
    ?? packages/ui/src/components/delta/
    ?? packages/ui/src/components/icon-badge/
    ?? packages/ui/src/components/legend/
    ?? packages/ui/src/components/skeleton/
    ?? packages/ui/src/components/stat-card/
    ?? packages/ui/src/components/swatch/
    ?? packages/ui/src/components/toggle-button/
    ?? packages/ui/src/components/tooltip/
    ?? packages/ui/src/hooks/
    ?? packages/ui/src/icons/
    ?? packages/ui/src/lib/format.test.ts
    ?? packages/ui/src/lib/format.ts
    ?? packages/ui/src/styles.css
    ?? packages/ui/src/theme/
    ?? packages/ui/vitest.config.ts
    ?? packages/ui/vitest.setup.ts
    ?? scripts/
```

## Tasks

| ID   | Status | Files changed                                                                                                                                                                                                                                                                                  | Verify                                                                                                                                                  | Review | Commit            |
| ---- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------- |
| T-01 | done   | ../../packages/ui/src/components/{input,textarea,select,field}/**, src/index.ts                                                                                                                                                                                                                | ui test 26/26 · --filter=...@frontend/ui lint/typecheck/build 13/13 (incl. client) · build-storybook ✅                                                 | PASS   | — (not committed) |
| T-02 | done   | ../../packages/ui/src/components/{dialog,table}/**, button/button.tsx (+danger variant, story), vitest.setup.ts (jsdom dialog stand-in), src/index.ts                                                                                                                                          | ui test 29/29 · --filter=...@frontend/ui 13/13 · build-storybook ✅                                                                                     | PASS   | — (not committed) |
| T-03 | done   | ../../packages/ui/src/components/toast/**, icons/index.ts (+ChevronLeft/Right, CircleAlert, X), src/index.ts                                                                                                                                                                                   | ui test 32/32 · --filter=...@frontend/ui 13/13 · build-storybook ✅ · real-browser check: dialog is :modal, focus trapped, Escape closes; toasts render | PASS   | — (not committed) |
| T-04 | done   | src/mocks/{fixtures/seed.json,store.ts,errors.ts,store.test.ts}, src/schemas/** + test, src/lib/week.ts + test, .gitignore, vitest.config.ts, package.json (vitest, test, mock:reset), lockfile                                                                                                | unit 16/16 · lint/typecheck/build ✅ · .mock-data ignored                                                                                               | PASS   | — (not committed) |
| T-05 | done   | src/mocks/{auth.ts,auth.test.ts,db.ts,http.ts}, src/lib/session.ts, src/app/api/auth/{login,logout,me}/route.ts, src/env.ts, .env.example, .env, package.json (jose), catalog, lockfile, e2e/api-auth.spec.ts                                                                                  | unit 20/20 · lint/typecheck/build ✅ · e2e auth 3/3 ✅                                                                                                  | PASS   | — (not committed) |
| T-06 | done   | src/app/api/admin/{daily-metrics,daily-metrics/[id],weeks/[weekStart],events,events/[id]}/route.ts, src/mocks/{query.ts,http.ts,store.ts (+race fix),store.test.ts}, e2e/api-admin.spec.ts                                                                                                     | unit 21/21 · lint/typecheck/build ✅ · e2e api 40/40 ×2 (--repeat-each=5, fresh data each round)                                                        | PASS   | — (not committed) |
| T-07 | done   | src/proxy.ts, src/app/login/page.tsx, src/app/(dashboard)/{layout,loading,error,page}.tsx, (dashboard)/events/page.tsx (placeholder), src/app/{layout,error}.tsx, src/features/auth/**, src/components/app-shell/app-nav.tsx, src/lib/{api-errors,server-api}.ts, e2e/{smoke,auth,fixtures}.ts | lint/typecheck/build ✅ · e2e 13/13 ✅ · MCP: no compilation/runtime errors on /login, /, /events                                                       | PASS   | — (not committed) |
| T-08 | done   | src/app/(dashboard)/page.tsx, src/features/{week-picker,weekly-data}/**, src/lib/{week.ts (+labels), week.test.ts, server-api.ts (serverGet)}, src/mocks/http.ts (dotted-path details), e2e/weekly-data.spec.ts                                                                                | unit 22/22 · lint/typecheck/build ✅ · e2e 17/17 ✅ · no hydration warnings · MCP clean                                                                 | PASS   | — (not committed) |
| T-09 | done   | src/app/(dashboard)/events/page.tsx, src/features/events/{events-manager,event-form-dialog}.tsx, e2e/events.spec.ts; also weekly-metrics-form.tsx (per-cell totals), weekly-data.spec.ts, ../../packages/ui/src/components/table/table.tsx (relative)                                          | lint/typecheck/build ✅ (incl. ...@frontend/ui 13/13) · e2e 21/21 ✅ · desktop + 375px screenshots reviewed                                             | PASS   | — (not committed) |
| T-10 | done   | e2e/global-setup.ts, playwright.config.ts, CLAUDE.md (app); docs: nextjs-frontend skill, root README/CLAUDE.md                                                                                                                                                                                 | e2e 21/21 dev + 21/21 CI=1 prod; reset proven with a corrupted db.json                                                                                  | PASS   | — (not committed) |

<!-- Status: todo → in-progress → review → changes-requested → done -->

## Log

- 2026-10-16 analyze: requirement drafted from US-08 – US-10, §1.1 and §1.2 (no screenshots for admin). The Analyst role was played by the main session, because the app's subagents only load when Claude Code starts in `apps/admin`.
- 2026-10-16 approve: requirement approved by the user ("approval"), with the open questions resolved as recommended.
- 2026-10-16 plan: 10 tasks drafted. T-01–T-03 target @frontend/ui (decision Q6); CI env is handled by client T-09.
- 2026-10-16 approve: plan approved by the user ("duyệt").
- 2026-10-16 T-01: Field is a render prop (like Tooltip) that wires id, aria-invalid and aria-describedby; the error uses role=alert; controlClasses is shared by all controls.
- 2026-10-16 T-02: deviation: added a Button 'danger' variant (needed for the destructive ConfirmDialog), outside the listed scope. Dialog uses native <dialog>.showModal(); jsdom lacks it, so a test-only stand-in is used and real behaviour is verified by E2E in T-09.
- 2026-10-16 T-03: deviation: added icons to icons/index.ts (outside the listed scope). Toasts use role=status, or role=alert for errors, in an aria-live list; the timer pauses on hover/focus.
- 2026-10-16 T-04: createStore({file, seed}) reads on every call, serialises writes and saves atomically; the domain errors NotFound/Conflict map to 404/409 in T-06; zod schemas are shared with the forms.
- 2026-10-16 T-05: scrypt with a random salt and timingSafeEqual; HS256 JWT, 1 day, httpOnly SameSite=Lax (Secure in prod); the seeded admin comes from env. The cookie helper was moved out of route.ts, because route files should only export handlers.
- 2026-10-16 T-06: parallel E2E exposed 2 real store bugs: (1) a seeding race with temp-name collisions, now fixed with a randomUUID temp name and an atomic link(); (2) a per-module write queue that route bundles duplicate, now fixed with a queue keyed by file on globalThis. Each E2E test writes to a unique far-future week.
- 2026-10-16 T-07: deviations: (1) proxy.ts doesn't redirect /login, to avoid a loop with a stale cookie, so the login page checks /me itself (covered by an E2E test); (2) a placeholder events page, needed by typedRoutes for the nav link and replaced in T-09; (3) fixed the root error.tsx to use retry() (the Next 16.3+ API).
- 2026-10-16 T-08: found and fixed a hydration mismatch: Node ICU puts U+2009 around the Intl.formatRange dash and Chromium doesn't, so date labels are now formatted by hand (unit-tested). The 400 details now use dotted paths (days.3.covers) so server errors map to table cells. Totals show cents only when needed.
- 2026-10-16 T-09: screenshots found 2 bugs the E2E missed, now fixed with regression tests: (1) the week totals dropped a whole day when one cell was invalid, so they now sum per cell; (2) a 123px page overflow on mobile: absolutely positioned sr-only labels escaped Table's scroll wrapper, so the wrapper is now relative (a @frontend/ui fix, out of scope but required).
- 2026-10-16 T-10: globalSetup resets the mock data before every run; the docs describe the mock backend, auth, data reset and hydration rule; the admin nextjs-frontend skill no longer says the API is on :4000.
