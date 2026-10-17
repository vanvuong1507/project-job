@AGENTS.md

# apps/client

`@frontend/client` is the public "Revenue Trend" dashboard, on port 3000.

- Spec: `../../../docs/US-TASK-DETAIL.md` EPIC 1 (US-01 – US-07).
- Reference images: `../../../docs/ui-reference/`.

## App context

- **Product.** There is no auth. The default view is Compare ON. KPIs come from the backend's `summary` field; never recompute them on the client.
- **Structure.** This follows "Project structure" in `.ai-workflow/features/production-architecture/requirement.md`. `src/app` is routing only, and ESLint `no-restricted-imports` enforces the boundaries.
  - `app/[locale]/`: `layout`, `page`, `loading`, `error`, `not-found` and `opengraph-image`. Also under `app/`: `api/dashboard/revenue-trend` (mock JSON), `global-error`, `robots`, `sitemap`, `manifest` and `icon.svg`.
  - `server/` (`import 'server-only'`): the DAL `revenue-trend/index.ts` (`getRevenueTrend`, React `cache`) and the sources `revenue-trend/sources/{mock,api}`. `logger.ts` deliberately has no `server-only`, because `instrumentation.ts` uses it.
  - `features/revenue-trend/`:
    - `components/`: the card, chart, KPIs, legend, markers and states;
    - `hooks/`: `useExportPng`, `useViewState`;
    - `lib/`: pure logic (series, chart rows, axis, events, `view-state`, `week-start`), with Vitest tests.
  - `components/`: providers (next-themes), site header, locale switcher, theme toggle, web vitals.
  - `i18n/`: `routing`, `navigation`, `request`, `global.ts` (typed keys) and `messages/{en,vi}.json`.
  - `lib/`: `dates`, `site`.
- **Data.** Server Components call the DAL directly; never fetch this app's own Route Handlers. `DATA_SOURCE=mock|api` selects the source.
  - `mock`: in-process fixtures; read-only, so admin edits don't show here until the backend exists.
  - `api`: the backend at the server-only `API_URL`, through `@frontend/api-client` with interceptors (request id) and GET retries.
- **Mock JSON endpoint.** `GET /api/dashboard/revenue-trend` exists for tools and E2E only. It returns 404 unless `ENABLE_MOCK_API=true`. `MOCK_DELAY_MS` adds latency so you can see the skeleton.
- **Input.** `?weekStart` is validated in the page (`parseWeekStart`) before data access. An invalid value shows an inline message; unexpected errors go to `error.tsx` (`retry()`), and a root failure to `global-error.tsx`.
- **View state in the URL.**
  - `?compare=0` and `?series=pos,labour`, with defaults omitted, parsed leniently by `lib/view-state.ts`.
  - Updates use `history.replaceState` through `useViewState`, which Next syncs with `useSearchParams`. Don't use `router.replace` here: it would refetch the RSC payload.
  - In E2E, use `click()` plus a retrying `expect`, not `check()`.
- **i18n (next-intl).**
  - `/` is English and `/vi` is Vietnamese (`as-needed`). `proxy.ts` negotiates the locale (cookie, then `Accept-Language`).
  - Every string comes from `i18n/messages/*.json`, merged with the shared `common` namespace from `@frontend/i18n`; keys are type-checked. `messages.test.ts` fails if `vi` misses a key.
  - Format with the `@frontend/ui` formatters plus `useLocale()`. Weekdays use `lib/format.weekdayLabel` (UTC).
  - `request.ts` uses next-intl's `requestLocale` (or an explicit `getTranslations({ locale })`), not `next/root-params`: root params throw inside Route Handlers (for example `opengraph-image`) and Server Actions in Next 16.4.
  - Never use `Intl.DateTimeFormat#formatRange` in rendered output: Node's ICU output differs from the browser's and causes hydration errors.
- **Theme.** `next-themes`, `class` strategy, defaulting to System. Dark values come only from the semantic tokens, so never add `dark:` overrides with raw colours. The toggle renders its value after mount (`useIsClient`).
- **Observability.** `instrumentation.ts` logs startup and, through `onRequestError`, one JSON line per server error (digest, `x-request-id`, route). `LOG_LEVEL` sets the threshold. `WebVitals` beacons to `NEXT_PUBLIC_VITALS_URL` when it is set.
- **Libraries.** The chart uses Recharts. Event markers are an HTML overlay aligned through `CHART_GEOMETRY`. PNG export uses `html-to-image`, loaded on click.

## Commands (from this folder)

- `pnpm dev` → http://localhost:3000
- `pnpm turbo run lint typecheck build --filter=@frontend/client`
- `pnpm test` (Vitest: mock source, chart/view-state logic, catalog completeness)
- `pnpm test:e2e` (Playwright, specs in `e2e/`); one test: `pnpm test:e2e -- e2e/smoke.spec.ts -g "<title>"`; `pnpm test:e2e:ui` for the UI mode

## Next.js agent tooling

These are the official tools from the [Next.js AI agents guide](https://nextjs.org/docs/app/guides/ai-agents).

- **Version-matched docs.** `AGENTS.md`, imported above, is managed by `next dev` (`agentRules`). It points to `node_modules/next/dist/docs/`. Read those docs before relying on memory for any Next.js API. Commit `AGENTS.md` as `next dev` writes it, and don't hand-edit its managed block.
- **MCP.** `.mcp.json` registers `next-devtools-mcp`, so while `pnpm dev` runs you get `nextjs_index` and `nextjs_call` against `/_next/mcp`. Useful tools include `get_errors`, `get_routes`, `get_compilation_issues` and `compile_route`. Claude Code asks you to approve the project MCP server the first time.
- **Skills** in `.claude/skills/` are vendored verbatim from `vercel/next.js`, pinned in `../../scripts/sync-next-skills.mjs`. Never edit them; re-run the script to update them.
  - `next-dev-loop` checks the change at runtime against a running `pnpm dev`, through `/_next/mcp` plus a real browser. It requires the `agent-browser` CLI ≥ 0.31.1 (`npm i -g agent-browser`).
  - `next-bundle-optimizer` audits the client bundle with `next analyze`. It defaults to audit-only mode and changes code only when you explicitly ask.
- **Not vendored:** `next-cache-components-*` and `next-partial-prefetching-*` are for apps with Cache Components enabled, which this app doesn't use yet. Add them to the sync script if you adopt that feature.

## AI workflow (this app only)

Run Claude Code from `apps/client`, so that this app's `.claude/` loads. The root `../../CLAUDE.md` also loads automatically; it holds the monorepo rules (commands, package impact, Git safety).

The entry point is `/workflow <phase> …`, defined in `.claude/commands/workflow.md`. State lives in `.ai-workflow/features/<slug>/` (`requirement.md`, `tasks.md`, `progress.md`, built from `.ai-workflow/templates/`). The usage guide is `.ai-workflow/README.md`.

| Phase                                          | Subagent     | Skill                                                   | Gate                            |
| ---------------------------------------------- | ------------ | ------------------------------------------------------- | ------------------------------- |
| analyze: request and screenshots → requirement | `analyst`    | `requirement-analysis`                                  | user approves the requirement   |
| plan: requirement → tasks                      | `planner`    | `task-planning`                                         | user approves the plan          |
| implement: one task at a time                  | `developer`  | `nextjs-frontend`, `ui-implementation`, `next-dev-loop` | verify commands pass            |
| review                                         | `reviewer`   | —                                                       | PASS                            |
| commit                                         | main session | —                                                       | user confirms files and message |

- **Approval.** No feature code is written until both `requirement.md` and `tasks.md` say `Status: Approved`. Only the user approves, either with `/workflow approve …` or explicitly in words.
- **Scope.** A task edits only its Scope: this app, or `../../packages/*` when the plan says so. Never `../admin/`.
- **Shared packages.** Changing one affects `@frontend/admin` too, so verify with `--filter=...@frontend/<pkg>`.
- **Small requests.** Questions and one-line fixes may skip the workflow. The Git rules still apply.
