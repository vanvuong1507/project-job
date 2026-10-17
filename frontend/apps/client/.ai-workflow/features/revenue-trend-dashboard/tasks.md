# Tasks: Revenue Trend dashboard (mock data)

- **Feature:** revenue-trend-dashboard · **Requirement:** ./requirement.md (Approved 2026-10-16)
- **Status:** Approved <!-- Draft → Approved (only after explicit user approval) -->
- **Approved by / date:** user, 2026-10-16 ("duyệt")

## Overview

| ID   | Title                                                            | Target           | Depends on       |
| ---- | ---------------------------------------------------------------- | ---------------- | ---------------- |
| T-01 | Mock fixtures and revenue-trend domain logic (with unit tests)   | @frontend/client | —                |
| T-02 | Mock Route Handler `GET /api/dashboard/revenue-trend` and env    | @frontend/client | T-01             |
| T-03 | Page data loading, KPI summary, and loading/error/empty states   | @frontend/client | T-02             |
| T-04 | Interactive card shell: compare toggle, series toggles, legend   | @frontend/client | T-03             |
| T-05 | Revenue chart (Recharts): stacked bars, axes, tooltip, animation | @frontend/client | T-04             |
| T-06 | Event impact markers with tooltips                               | @frontend/client | T-05             |
| T-07 | Export PNG                                                       | @frontend/client | T-04             |
| T-08 | Responsive layout and full E2E suite                             | @frontend/client | T-05, T-06, T-07 |
| T-09 | CI: per-app env from `.env.example` (repo-level, see note)       | repo (root)      | T-02             |

**Architecture**, applying requirement decisions Q2 and Q5:

```
src/
  app/
    api/dashboard/revenue-trend/route.ts   mock HTTP endpoint (§1.2 contract)
    page.tsx · loading.tsx · error.tsx     Server Component page + route states
  mocks/                                   server-only mock backend
    fixtures/daily-metrics.json · events.json
    revenue-trend.ts                       week math, 7-day fill, summary (pure)
  features/revenue-trend/
    api/get-revenue-trend.ts               server data access via `api` (no-store)
    components/                            card, KPI summary, chart, legend, markers, states
    hooks/use-export-png.ts
    lib/                                   chart-data mapping, axis scale, event aggregation (pure)
```

The page never imports `src/mocks` directly. It calls `api` (`NEXT_PUBLIC_API_URL`), which in dev points at this app's own Route Handler. Swapping to the real backend means changing env only (AC-2).

---

## T-01 — Mock fixtures and revenue-trend domain logic

- **Target:** @frontend/client
- **Scope (allowed paths):**
  - `src/mocks/**`
  - `vitest.config.ts`
  - `package.json` (devDependency + `test` script)
  - `../../pnpm-lock.yaml`
- **Depends on:** —
- **Dependencies to add:** `vitest` (dev, `catalog:`). The app has no unit-test runner, and AC-4/AC-5 are pure calculations that deserve fast unit tests rather than E2E. The root `pnpm test` / turbo `test` picks it up automatically.
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] JSON fixtures hold 2 consecutive weeks, Mon 2026-10-05 → Sun 2026-10-11 (previous) and Mon 2026-10-12 → Sun 2026-10-18 (current), with values matching the video:
    - revenue 15,974 vs 14,982;
    - covers 871 vs 820;
    - Fri NEGATIVE and Sat POSITIVE events in the current week (AC-3).
  - [ ] `buildRevenueTrend(weekStart?)`:
    - returns a `RevenueTrendResponse` with exactly 7 days, Mon–Sun, and zero metrics for missing days;
    - previous period = the 7 days before;
    - defaults to the latest week that has data (AC-4, AC-5, Q3).
  - [ ] Summary rules (AC-4):
    - total = Σ(POS + Eatclub);
    - average = round(total / 7);
    - covers = Σ;
    - `changePct` rounded to 1 decimal, and `null` when the previous value is 0.
  - [ ] `parseWeekStart` rejects a value that isn't `YYYY-MM-DD` or isn't a Monday, with a typed error (AC-5).
  - [ ] Unit tests cover:
    - the video totals and percentages;
    - missing days;
    - a week with no data (all zeros);
    - an invalid/non-Monday `weekStart`;
    - the `null` `changePct` case.
- **Verify:**
  - `pnpm --filter @frontend/client test`
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
- **Commit:** `feat(client): add revenue-trend mock fixtures and domain logic`

## T-02 — Mock Route Handler and env

- **Target:** @frontend/client
- **Scope (allowed paths):**
  - `src/app/api/dashboard/revenue-trend/route.ts`
  - `src/env.ts`
  - `.env.example`
  - `.env` (local only, git-ignored)
  - `e2e/api.spec.ts`
- **Depends on:** T-01
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] `GET /api/dashboard/revenue-trend[?weekStart=]`:
    - returns `200` and the `RevenueTrendResponse` JSON, with `Cache-Control: no-store`;
    - returns `400 { error, details }` for an invalid `weekStart` (AC-2, AC-5).
  - [ ] The optional server env `MOCK_DELAY_MS` (zod: non-negative integer) delays the response (Q4).
  - [ ] `.env.example` sets `NEXT_PUBLIC_API_URL=http://localhost:3000` and documents that it points at this app's mock (Q2).
  - [ ] The E2E API spec covers the 200 shape (KPI totals from the fixtures) and the 400 for a non-Monday `weekStart`.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - `pnpm test:e2e -- e2e/api.spec.ts`
  - Runtime (next-dev-loop): `/api/dashboard/revenue-trend` returns JSON, and `get_errors` is clean.
- **Commit:** `feat(client): serve revenue-trend mock over the §1.2 API`

## T-03 — Page data loading, KPI summary, and states

- **Target:** @frontend/client
- **Scope (allowed paths):**
  - `src/app/page.tsx`
  - `src/app/loading.tsx`
  - `src/app/error.tsx`
  - `src/features/revenue-trend/api/**`
  - `src/features/revenue-trend/components/{kpi-summary,revenue-trend-skeleton,revenue-trend-empty}.tsx`
  - `e2e/smoke.spec.ts`
- **Depends on:** T-02
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] `page.tsx` is a Server Component. It reads `searchParams.weekStart` and fetches through `getRevenueTrend()`, which calls `api.get` with `cache: 'no-store'` (AC-1, AC-2, AC-5).
  - [ ] `KpiSummary` renders 3 `StatCard`s from `summary` using `formatCurrency` and `formatNumber`. With compare on it shows `vs` plus a `Delta`, and the `%` is hidden when the value is `null` (AC-8).
  - [ ] `loading.tsx` shows a card-shaped `Skeleton`. `error.tsx` shows a message and a Retry button that calls `reset()` (an invalid `weekStart` lands here). A week whose values are all 0 renders an empty state (AC-13).
  - [ ] `smoke.spec.ts` is updated so the heading and the 3 KPI values come from the fixtures.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - `pnpm test:e2e`
  - Runtime (next-dev-loop): `/` shows 3 KPIs ($15,974 · $2,282 · 871); `/?weekStart=2026-10-13` shows the error state with Retry; `/?weekStart=2026-01-05` shows the empty state.
- **Commit:** `feat(client): load revenue trend on the dashboard page with KPI summary and states`

## T-04 — Interactive card shell: compare, series, legend

- **Target:** @frontend/client
- **Scope (allowed paths):**
  - `src/features/revenue-trend/components/{revenue-trend-card,revenue-legend}.tsx`
  - `src/features/revenue-trend/lib/series.ts`
  - `src/app/page.tsx`
  - `e2e/revenue-trend.spec.ts`
- **Depends on:** T-03
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] `RevenueTrendCard` (`'use client'`) composes `Card*`, the title, 3 `Checkbox` + `Swatch` series toggles (`useSelectionSet`, `min: 1`), a `ToggleButton` "Compare to Previous" (default ON), and slots for the chart and export (AC-6).
  - [ ] Compare toggles the title suffix " vs Previous Period", the KPI comparison, and the legend set (3 items + events ↔ 6 items + events) (AC-9).
  - [ ] Unchecking a series dims its legend item (Q6). The last checked series can't be unchecked, and KPIs don't change (AC-10).
  - [ ] Series metadata (key, labels, current/previous tokens) is defined once in `lib/series.ts`.
  - [ ] An E2E spec covers the compare toggle (title, legend count, KPI `vs`), and the series toggle (dimmed legend, last box disabled).
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - `pnpm test:e2e`
  - Runtime (next-dev-loop): on `/`, toggling Compare switches the title and legend, and `get_errors` is clean.
- **Commit:** `feat(client): add compare and series toggles to the revenue trend card`

## T-05 — Revenue chart (Recharts)

- **Target:** @frontend/client
- **Scope (allowed paths):**
  - `src/features/revenue-trend/components/revenue-chart.tsx`
  - `src/features/revenue-trend/lib/{chart-data,axis}.ts` and `*.test.ts` next to them
  - `src/features/revenue-trend/components/revenue-trend-card.tsx`
  - `package.json`
  - `../../pnpm-lock.yaml`
  - `../../pnpm-workspace.yaml` (catalog entry)
  - `e2e/revenue-trend.spec.ts`
- **Depends on:** T-04
- **Dependencies to add:** `recharts` (catalog). The spec recommends it: it supports stacked bars (`stackId`), rounded bars and built-in animation (Q5).
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] Per day there is a stacked current revenue bar (POS + Eatclub) and a current labour bar. With compare on, there are also a previous revenue bar (POS prev + Eatclub prev) and a previous labour bar. Bars have rounded tops and colours from `colorVar('chart-*')` (AC-7).
  - [ ] Y axis:
    - 4 equal intervals, labelled with `formatThousands`;
    - the maximum is derived from the visible data and rounded up to a nice step, which gives 3k for the video data (unit-tested in `axis.test.ts`).
  - [ ] The grid is dashed, using `chart-grid`. The X axis shows Mon–Sun.
  - [ ] Hidden series are removed from both current and previous bars (AC-10).
  - [ ] Bars animate over about 500ms when data, compare mode or series change (AC-9).
  - [ ] Hovering a day shows a tooltip with every visible series value for it, as currency (AC-14).
  - [ ] Recharts is loaded only in the client component, and is not imported by server files.
- **Verify:**
  - `pnpm --filter @frontend/client test`
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - `pnpm test:e2e`
  - Runtime (next-dev-loop): `/` shows the chart with axis labels 0k–3k; with compare off there are 2 bars per day; `get_errors` is clean.
- **Commit:** `feat(client): render the revenue trend chart with recharts`

## T-06 — Event impact markers

- **Target:** @frontend/client
- **Scope (allowed paths):**
  - `src/features/revenue-trend/components/{event-marker,revenue-chart}.tsx`
  - `src/features/revenue-trend/lib/events.ts` and `events.test.ts`
  - `e2e/revenue-trend.spec.ts`
- **Depends on:** T-05
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] Days with events show one `IconBadge` (positive: TrendingUp, negative: TrendingDown) centred above the day's tallest **visible** bar.
  - [ ] When a day has several events, the marker shows the majority impact. A tie counts as negative, as the safer signal (unit-tested).
  - [ ] Each marker is a focusable button with an accessible name (for example "Negative event impact, Fri"). Its `Tooltip` lists every event's title and description (AC-11).
  - [ ] The E2E spec checks that Fri and Sat have markers and that focusing one shows its event title.
- **Verify:**
  - `pnpm --filter @frontend/client test`
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - `pnpm test:e2e`
  - Runtime (next-dev-loop): `/` shows a red marker on Fri and a green one on Sat, and the tooltip shows the event title.
- **Commit:** `feat(client): show event impact markers on the revenue chart`

## T-07 — Export PNG

- **Target:** @frontend/client
- **Scope (allowed paths):**
  - `src/features/revenue-trend/hooks/use-export-png.ts`
  - `src/features/revenue-trend/components/revenue-trend-card.tsx`
  - `package.json`
  - `../../pnpm-lock.yaml`
  - `../../pnpm-workspace.yaml` (catalog entry)
  - `e2e/revenue-trend.spec.ts`
- **Depends on:** T-04
- **Dependencies to add:** `html-to-image` (catalog), for DOM → PNG as the spec suggests (Q5). Loaded with a dynamic `import()` on click, so it isn't in the initial bundle.
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] Clicking "Export PNG" downloads `revenue-trend-<weekStart>.png` of the card in its current state, on a white background, without the export button (AC-12).
  - [ ] The button shows `loading` while exporting. A failure is reported inline, and nothing crashes.
  - [ ] The E2E spec asserts the download's suggested filename.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - `pnpm test:e2e`
  - Runtime (next-dev-loop): clicking Export on `/` downloads the PNG, and `get_errors` is clean.
- **Commit:** `feat(client): export the revenue trend card as PNG`

## T-08 — Responsive layout and full E2E

- **Target:** @frontend/client
- **Scope (allowed paths):**
  - `src/features/revenue-trend/components/**`
  - `e2e/**`
- **Depends on:** T-05, T-06, T-07
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:**
  - [ ] Below 768px:
    - the header wraps;
    - the KPIs stack;
    - the chart scrolls horizontally inside the card;
    - `document.scrollingElement.scrollWidth` ≤ the viewport width (AC-15).
  - [ ] The E2E suite covers everything in AC-17, plus a 375px-viewport check.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - `pnpm test:e2e`
  - `CI=1 pnpm test:e2e`, against the production build
  - Runtime (next-dev-loop): `/` at 375px and 1280px matches the reference layout.
- **Commit:** `feat(client): make the revenue trend card responsive and complete e2e coverage`

## T-09 — CI: per-app env (repo-level)

> ⚠️ **Outside the app's default scope.** `.github/workflows/ci.yml` currently sets one global `NEXT_PUBLIC_API_URL=http://localhost:4000` for every app. With per-app mocks, client must use `:3000` and admin `:3001`. This needs your explicit approval as part of this plan, and it also affects `@frontend/admin`.

- **Target:** repo (root config)
- **Scope (allowed paths):** `../../.github/workflows/ci.yml`
- **Depends on:** T-02
- **Dependencies to add:** none
- **Affected consumers:** `@frontend/client`, `@frontend/admin` (CI build and e2e)
- **Acceptance criteria:**
  - [ ] CI removes the global `NEXT_PUBLIC_*` env and instead copies each `apps/*/.env.example` to `.env` before building. CI then uses exactly the documented defaults.
- **Verify:**
  - `pnpm check`
  - Review the workflow YAML
- **Commit:** `ci(repo): load per-app env from .env.example`
