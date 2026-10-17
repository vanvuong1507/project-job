# AI workflow — apps/client

Run Claude Code **from `apps/client`**:

```bash
cd apps/client && claude
```

```
/workflow analyze …                 → analyst   → requirement.md (Draft)
/workflow approve <slug> requirement            ← you
/workflow plan <slug>               → planner   → tasks.md (Draft)
/workflow approve <slug> plan                   ← you
/workflow implement <slug> T-01     → developer → reviewer (automatic)
/workflow commit <slug> T-01                    ← you confirm files + message
/workflow status [slug]
```

- Each feature lives in `features/<slug>/` and is built from `templates/`.
- Nothing is implemented until you approve both the requirement and the plan.
- Commits stage only the task's files, follow Conventional Commits, and are never pushed.

## Example: KPI cards (US-02)

**1. Analyze.**

```
/workflow analyze Build the 3 KPI cards (Total Revenue, Average per Day, Total Covers) per US-02. Screenshots: ../../../docs/ui-reference/01-compare-on.jpg ../../../docs/ui-reference/02-compare-off.jpg
```

- This creates `features/kpi-cards/requirement.md`.
- The analyst maps the colours to tokens (`bg-kpi`, plus positive and negative for the % change) and ties the values to `summary.*`.
- It asks open questions, for example "Hide the % when `changePct` is null?"

**2. Approve the requirement.** Answer the questions, then run `/workflow approve kpi-cards requirement`.

**3. Plan.** Run `/workflow plan kpi-cards`:

| ID   | Title                                                                  | Target           | Depends on |
| ---- | ---------------------------------------------------------------------- | ---------------- | ---------- |
| T-01 | `formatCurrency` / `formatPct` in `src/lib/format.ts`                  | @frontend/client | —          |
| T-02 | `KpiCard` + `KpiCards` (compare on/off) in `src/components/kpi/`       | @frontend/client | T-01       |
| T-03 | Fetch revenue-trend in `src/app/page.tsx`, render KPIs + loading/error | @frontend/client | T-02       |

Each task is verified with `pnpm turbo run lint typecheck build --filter=@frontend/client`, plus a manual check at http://localhost:3000.

**4. Approve the plan.** Run `/workflow approve kpi-cards plan`.

**5. Implement and review.** Run `/workflow implement kpi-cards T-01`. The reviewer returns PASS with a proposed message, for example `feat(client): add currency and percent formatters` with the footer `Refs: kpi-cards T-01`.

**6. Commit.** Run `/workflow commit kpi-cards T-01` and confirm. Repeat for T-02 and T-03.
