# Requirement: Revenue Trend dashboard (mock data)

- **Slug:** revenue-trend-dashboard
- **Status:** Approved <!-- Draft → Approved (set only after explicit user approval) -->
- **Approved by / date:** user, 2026-10-16 ("approval"; open questions resolved with the recommended options)
- **Source:**
  - User request (2026-10-16): implement the task detail for each app, mock the data inside each app (no backend yet), return JSON from the mock, and follow Next.js architecture and clean code.
  - `../../../docs/US-TASK-DETAIL.md`, EPIC 1 (US-01 – US-07) and the API contract in §1.2.
  - Screenshots: `../../../docs/ui-reference/01-compare-on.jpg`, `02-compare-off.jpg`, `03-transition-animation.jpg`.
- **Targets:** @frontend/client. Possibly `@frontend/ui` too, for new shared pieces; Q5 decides.

## Goal

A restaurant manager opens the public dashboard and sees one "This Week's Revenue Trend" card that matches the reference video: KPIs, a 7-day stacked bar chart, a comparison with the previous period, series toggles, event markers, and PNG export.

There is no backend yet. All data comes from a **mock owned by `apps/client`** that returns JSON in exactly the §1.2 contract. Switching to the real backend later must be a configuration change, not a component change.

## Context / existing code

- `src/app/page.tsx` is a placeholder card. `layout.tsx` (Inter font, metadata), `error.tsx` (Retry button) and `not-found.tsx` exist.
- `src/env.ts` validates env with t3/zod. `NEXT_PUBLIC_API_URL` is required, and `API_INTERNAL_URL` is optional and server-only.
- `src/lib/api.ts` is `createHttpClient` from `@frontend/api-client`, with a 15s timeout and `ApiError`.
- `@frontend/api-client` already has the DTOs `RevenueTrendResponse`, `RevenueTrendDay`, `DayMetrics`, `DayEvent` and `SummaryValue`.
- `@frontend/ui` already has:
  - components: `Card` / `CardHeader` / `CardTitle` / `CardActions` / `CardContent`, `Checkbox`, `Swatch`, `ToggleButton`, `Button`, `StatCard`, `Delta`, `Legend` / `LegendItem` / `LegendSeparator`, `IconBadge`, `Tooltip`, `Skeleton`;
  - hooks: `useSelectionSet` (with `min`) and `useTooltip`;
  - formatters: `formatCurrency`, `formatNumber`, `formatThousands`, `formatPercentChange`, `getTrend`;
  - helpers: `colorVar()` and icons.
- The `Components/Card → Reference Composition` story already rebuilds the header, KPIs and legend from those pieces. The chart is the missing part.
- Not installed: a chart library and a DOM-to-PNG library. The spec suggests Recharts and `html-to-image`.
- E2E: `e2e/smoke.spec.ts` checks the placeholder heading.

## UI analysis (from the 3 screenshots)

| Region / component                                                                                                                     | States                                               | Tokens                                                                      | Data source                                            | Exists in @frontend/ui?                               |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------- |
| Page background                                                                                                                        | —                                                    | `bg-canvas`                                                                 | —                                                      | —                                                     |
| Card (radius ~16, light border)                                                                                                        | default; loading; error; empty                       | `bg-surface`, `border-border`, `rounded-card`, `shadow-card`                | —                                                      | ✅ `Card*`                                            |
| Title: "This Week's Revenue Trend" + " vs Previous Period" when comparing; wraps to 2 lines                                            | compare on/off                                       | `text-foreground`, text-xl                                                  | static copy                                            | ✅ `CardTitle`                                        |
| 3 series checkboxes, each with a line swatch: POS, Eatclub, Labour                                                                     | checked / unchecked / disabled (last checked one)    | `bg-primary` box; `chart-pos`, `chart-eatclub`, `chart-labour`              | client state                                           | ✅ `Checkbox` + `Swatch` + `useSelectionSet`          |
| "Compare to Previous" button with chart icon                                                                                           | pressed (dark) / unpressed (yellow, darker on hover) | `primary`, `accent`, `accent-hover`                                         | client state                                           | ✅ `ToggleButton` + `ChartColumnIcon`                 |
| "Export PNG" button with download icon                                                                                                 | default / hover / busy while exporting               | outline: `bg-surface-muted`, `border-border`                                | —                                                      | ✅ `Button variant="outline"` (+ `loading`)           |
| 3 KPI tiles: Total Revenue, Average per Day, Total Covers                                                                              | value only (off) / value + `vs <prev> (+x.x%)` (on)  | `bg-surface-muted`, `rounded-tile`; delta `text-positive` / `text-negative` | `summary.totalRevenue`, `averagePerDay`, `totalCovers` | ✅ `StatCard` + `Delta`                               |
| Y axis: `0k 0.75k 1.5k 2.25k 3k`, dashed grid                                                                                          | —                                                    | `chart-grid`, `text-muted-foreground`                                       | derived from the day values                            | ❌ chart (app-level)                                  |
| X axis: Mon … Sun                                                                                                                      | —                                                    | `text-muted-foreground`                                                     | `days[].dayLabel`                                      | ❌ chart                                              |
| Per day: current revenue bar (POS dark, with Eatclub indigo stacked on top) and current labour bar (orange)                            | animated grow on data or mode change                 | `chart-pos`, `chart-eatclub`, `chart-labour`                                | `days[].current.*`                                     | ❌ chart                                              |
| Per day, compare on only: previous revenue bar (grey + light indigo) and previous labour bar (light orange)                            | appears with animation                               | `chart-pos-prev`, `chart-eatclub-prev`, `chart-labour-prev`                 | `days[].previous.*`                                    | ❌ chart                                              |
| Event marker: round icon above the day's tallest bar; green trending-up or red trending-down (Sat positive, Fri negative in the video) | hover/focus shows a tooltip                          | `positive(-soft)`, `negative(-soft)`                                        | `days[].events[]`                                      | ✅ `IconBadge` + `Tooltip` (positioning is app-level) |
| Legend: 3 items (off) or 6 items (on), separator, then the two event-impact items                                                      | item dimmed when its series is hidden                | `chart-*` swatches                                                          | client state                                           | ✅ `Legend*` + `Swatch`                               |
| 4 cards below the main card (Period Comparison, …)                                                                                     | —                                                    | —                                                                           | —                                                      | out of scope                                          |

New tokens needed: **none**. Every colour in the screenshots maps to an existing semantic token.

## Acceptance criteria

**Data and mock**

- [ ] AC-1: All data on `/` comes from a mock that lives entirely inside `apps/client`:
  - JSON fixtures are committed in the app.
  - The served JSON validates against `RevenueTrendResponse` (§1.2).
  - No business numbers are hard-coded in components.
- [ ] AC-2: The mock is reachable over HTTP as JSON at `GET /api/dashboard/revenue-trend?weekStart=YYYY-MM-DD`, with the §1.2 path and shape. Pointing the app at a real backend later needs only env changes; no component or page code changes.
- [ ] AC-3: The fixtures contain at least two consecutive weeks that reproduce the video:
  - Total Revenue $15,974 vs $14,982 (+6.6%), Average per Day $2,282 vs $2,140 (+6.6%), and Total Covers 871 vs 820 (+6.2%);
  - a NEGATIVE event on Friday and a POSITIVE event on Saturday of the current week.
- [ ] AC-4: The mock computes `summary` from the day fixtures with the spec's rules:
  - `totalRevenue` = Σ(POS + Eatclub);
  - `averagePerDay` = total ÷ 7, rounded;
  - `changePct` has 1 decimal, and is `null` when the previous value is 0.

  It always returns 7 days (Mon–Sun), with missing days as zeros.

- [ ] AC-5: `weekStart` selects the week. With no `weekStart`, the latest week that has data is shown. If `weekStart` is badly formatted or isn't a Monday, the mock answers `400 { error, details }` and the page shows the error state.

**View (US-01, US-02, US-03)**

- [ ] AC-6: `/` renders the card in **Compare ON** by default (as in the first frame of the video), using the layout, colours and copy in the UI analysis.
- [ ] AC-7: The chart shows Mon–Sun:
  - each day has a stacked revenue bar (POS below, Eatclub above) and a labour bar, with rounded top corners;
  - the Y axis uses `k` labels with 4 equal intervals;
  - the axis maximum is derived from the data and rounded up to a "nice" value (3k for the video data).
- [ ] AC-8: The KPI tiles show the `summary` values formatted as `$15,974` and `871`.
  - With Compare ON they show `vs <previous> (+x.x%)`: green when ≥ 0, red when < 0, and the % hidden when `changePct` is `null`.
  - KPIs don't change when series are toggled.
- [ ] AC-9: Toggling "Compare to Previous":
  - adds or removes the two previous-period bars per day;
  - switches the title and the legend set (3 items ↔ 6 items);
  - shows or hides the KPI comparison;
  - animates the bars over about 400–600 ms.
  - The data doesn't change when you toggle.

**Series, events, export (US-04, US-05, US-06)**

- [ ] AC-10: Unchecking a series hides it in both the current and previous bars, and dims its legend item. At least one series must stay checked; the last checked box can't be unchecked.
- [ ] AC-11: A day with events shows one marker above its tallest visible bar.
  - The icon shows the majority impact.
  - Hover or keyboard focus shows a tooltip listing every event's title, plus its description when there is one.
  - Markers are keyboard-reachable and have an accessible name.
- [ ] AC-12: "Export PNG" downloads `revenue-trend-<weekStart>.png` of the card in its current state (compare mode and visible series), on a white background, without the export button itself. The button shows a busy state while it works.

**States and responsive (US-01, US-07)**

- [ ] AC-13: Loading shows a skeleton of the card. An API or mock error shows a message with a Retry button. A week whose values are all 0 shows an empty state.
- [ ] AC-14: Hovering a bar group shows a tooltip with every visible series value for that day.
- [ ] AC-15: Below 768px:
  - the header wraps;
  - the KPIs stack vertically;
  - the chart scrolls horizontally inside the card, and the page itself doesn't scroll sideways.

**Quality**

- [ ] AC-16: `pnpm turbo run lint typecheck build --filter=@frontend/client` passes.
- [ ] AC-17: Playwright E2E covers:
  - the KPI values from the fixtures;
  - the Compare toggle (title, legend count, KPI comparison);
  - unchecking a series (legend dims, and the last series can't be unchecked);
  - the export download filename;
  - an invalid `weekStart` → error state.

## Out of scope

- The 4 cards below the main card (spec §6).
- Real backend, database, auth.
- Anything in `apps/admin`, including its admin UI and its own mock.
- A week-navigation UI on the client. Weeks are selected through `?weekStart=`, as the admin's links do.
- Multi-restaurant data, i18n, dark mode.

## Open questions

- **Q1. Admin edits vs. per-app mocks.** Spec US-01 expects "admin updates data → reloading the dashboard shows the new numbers". With a separate mock in each app, as you asked, the client's mock can't see the admin's edits.
  - **(a)** Accept that until the real backend exists: the client mock is read-only fixtures. _(recommended, matches "mock riêng cho từng app")_
  - **(b)** Both mocks read and write one shared JSON file outside the apps. That restores sync, but it is a shared mock rather than a per-app one.
- **Q2. How the mock is served.** Recommended: Next.js **Route Handlers** in `src/app/api/...` that implement the §1.2 contract from the JSON fixtures, with `NEXT_PUBLIC_API_URL` pointing at the app itself in dev (`http://localhost:3000`). Components keep using `api` from `@/lib/api`, so moving to the real backend only means changing env. The alternative is a server-side data-source switch with no HTTP (an env flag `DATA_SOURCE=mock|api`), which avoids the self-request but means the "JSON returned from a call" isn't a real HTTP response.
- **Q3. Default week.** With no `weekStart`, show the latest week that has fixture data (spec), or the current calendar week (Mon 2026-10-12)? Recommended: latest week with data.
- **Q4. Exercising loading and error states.** Should the mock support an optional artificial delay (for example an env `MOCK_DELAY_MS`) and an error trigger, so the skeleton and Retry can be seen and tested? Recommended: a delay env var, plus the invalid-`weekStart` path for errors.
- **Q5. New dependencies and their location.**
  - Add `recharts` and `html-to-image` (as the spec suggests) to `@frontend/client` only?
  - Keep the chart and event-marker positioning in the app, since only the client uses them?

  Recommended: yes to both.

- **Q6. Hidden series in the legend.** The spec allows hiding or dimming. Recommended: dim (as written in AC-10), so the item stays visible and clickable context isn't lost.

## Decisions (resolved open questions)

- **Q1 → (a):** The client mock is read-only fixtures. Admin edits do not appear on the dashboard until the real backend exists.
- **Q2 → Route Handlers:** `src/app/api/dashboard/revenue-trend/route.ts` implements §1.2 from JSON fixtures. `NEXT_PUBLIC_API_URL` points to the app itself in dev (`http://localhost:3000`).
- **Q3 → Latest week with data:** used when `weekStart` is omitted.
- **Q4 → `MOCK_DELAY_MS`:** optional env var for an artificial delay. Errors come from the invalid-`weekStart` path (400).
- **Q5 → `recharts` + `html-to-image`:** added to `@frontend/client` only. The chart and marker positioning stay in the app.
- **Q6 → Dim:** a hidden series dims its legend item.
