# Progress: Revenue Trend dashboard (mock data)

| Phase          | Status   | Date / note                                                             |
| -------------- | -------- | ----------------------------------------------------------------------- |
| Requirement    | Approved | 2026-10-16 — user approved; Qs resolved with recommended options        |
| Plan           | Approved | 2026-10-16 — user approved T-01…T-09                                    |
| Implementation | Done     | 2026-10-16 — T-01…T-09 PASS, not committed (awaiting your confirmation) |

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

| ID   | Status | Files changed                                                                                                                                                                       | Verify                                                                                                                                                            | Review | Commit            |
| ---- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------- |
| T-01 | done   | src/mocks/** (fixtures, dates, data, revenue-trend + tests), vitest.config.ts, package.json, pnpm-lock                                                                              | test 12/12 · lint/typecheck/build ✅                                                                                                                              | PASS   | — (not committed) |
| T-02 | done   | src/app/api/dashboard/revenue-trend/route.ts, src/env.ts (MOCK_DELAY_MS), .env.example, e2e/api.spec.ts                                                                             | lint/typecheck/build ✅ · e2e api 3/3 ✅                                                                                                                          | PASS   | — (not committed) |
| T-03 | done   | src/app/{page,loading,error}.tsx, src/features/revenue-trend/api/get-revenue-trend.ts, components/{kpi-summary,revenue-trend-skeleton,revenue-trend-message}.tsx, e2e/smoke.spec.ts | lint/typecheck/build ✅ · e2e 6/6 ✅ · MCP: no compilation issues, no runtime errors                                                                              | PASS   | — (not committed) |
| T-04 | done   | src/features/revenue-trend/{lib/series.ts, components/revenue-trend-card.tsx, components/revenue-legend.tsx}, src/app/page.tsx, e2e/revenue-trend.spec.ts                           | lint/typecheck/build ✅ · e2e 8/8 ✅                                                                                                                              | PASS   | — (not committed) |
| T-05 | done   | components/revenue-chart.tsx, lib/{axis,chart-data}.ts + tests, revenue-trend-card.tsx, package.json (recharts), pnpm-workspace catalog, lockfile, e2e/revenue-trend.spec.ts        | unit 23/23 · lint/typecheck/build ✅ · e2e 9/9 ✅ · screenshot matches the reference (compare on/off)                                                             | PASS   | — (not committed) |
| T-06 | done   | components/{event-marker,revenue-chart}.tsx, lib/events.ts + test, e2e/revenue-trend.spec.ts                                                                                        | unit 26/26 · lint/typecheck/build ✅ · e2e 10/10 ✅                                                                                                               | PASS   | — (not committed) |
| T-07 | done   | hooks/use-export-png.ts, components/revenue-trend-card.tsx, package.json (html-to-image), pnpm-workspace catalog, lockfile, e2e/revenue-trend.spec.ts                               | lint/typecheck/build ✅ · e2e 11/11 ✅ · real PNG inspected (2208×1308, white bg, no export button, current state)                                                | PASS   | — (not committed) |
| T-08 | done   | components/{revenue-chart,event-marker}.tsx, e2e/responsive.spec.ts                                                                                                                 | lint/typecheck/build ✅ · e2e 13/13 (dev + CI=1 prod) ✅ · responsive spec 20/20 with --repeat-each=10 · MCP: no compilation/runtime errors · 375px screenshot OK | PASS   | — (not committed) |
| T-09 | done   | ../../.github/workflows/ci.yml                                                                                                                                                      | pnpm check ✅ (16/16 tasks)                                                                                                                                       | PASS   | — (not committed) |

<!-- Status: todo → in-progress → review → changes-requested → done -->

## Log

- 2026-10-16 analyze: requirement drafted from US-01 – US-07, §1.2 and the 3 reference screenshots. The Analyst role was played by the main session, because the app's subagents only load when Claude Code starts in `apps/client`.
- 2026-10-16 approve: requirement approved by the user ("approval"), with the open questions resolved as recommended.
- 2026-10-16 plan: 9 tasks drafted. T-09 is a repo-level CI change, flagged for explicit approval.
- 2026-10-16 approve: plan approved by the user ("duyệt").
- 2026-10-16 T-01: fixtures match the video totals (15,974/14,982, 871/820, max bar 2,900); the fixtures are zod-validated at load.
- 2026-10-16 T-02: the mock serves the §1.2 JSON with no-store and returns 400 {error, details} for a non-Monday weekStart; NEXT_PUBLIC_API_URL now points at the app itself.
- 2026-10-16 T-03: deviations: (1) one RevenueTrendMessage component for both empty and expected-error states, instead of revenue-trend-empty.tsx; (2) an invalid weekStart renders an inline explanation with a 'Show the latest week' link, and Retry (error.tsx) is reserved for unexpected failures. Found that Next 16.4 error.tsx uses retry() (re-fetches) rather than reset(), and fixed it here; the admin's error.tsx has the same issue (to fix in an admin task).
- 2026-10-16 T-04: compare is on by default; the title, KPI comparison and legend (6↔3 series) follow it; a series checkbox dims its legend item; at least 1 series stays visible (useSelectionSet min 1).
- 2026-10-16 T-05: a unit test caught a real bug in the axis (1,120 → 2,000 instead of 1,200); added nice factors 3 and 4. Fixed plot geometry (CHART_GEOMETRY) is exported for the marker overlay.
- 2026-10-16 T-06: markers are HTML buttons positioned over the plot area (CHART_GEOMETRY); majority impact wins and a tie counts as negative; tooltip via @frontend/ui Tooltip (focus/hover/Escape).
- 2026-10-16 T-07: html-to-image is loaded on demand; the export button is excluded via data-export-ignore; on failure an inline alert is shown.
- 2026-10-16 T-08: the chart scrolls inside the card only below md (an overflow-x container would clip tooltips), so event tooltips open below the marker. A flaky test (measuring before the streamed chart rendered) was fixed by waiting for the bars plus expect.poll.
- 2026-10-16 T-09: CI drops the global NEXT_PUBLIC_* env and copies each apps/*/.env.example to .env, so every app uses its documented defaults (its own mock).
- 2026-10-16 docs: the app CLAUDE.md now describes the mock backend and feature layout, and no longer says admin edits show on the dashboard (decision Q1).
