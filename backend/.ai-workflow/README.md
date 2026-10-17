# AI workflow — backend

Run Claude Code **from the backend repo root**:

```bash
cd backend && claude
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

## Skills used

| Skill                              | Source                                            | Used by             |
| ---------------------------------- | ------------------------------------------------- | ------------------- |
| `requirement-analysis`             | this repo                                         | analyst             |
| `task-planning`                    | this repo                                         | planner             |
| `nestjs-backend`                   | this repo (project conventions, wins on conflict) | developer           |
| `typeorm-migrations`               | this repo                                         | developer           |
| `api-contract`                     | this repo                                         | analyst, developer  |
| `nestjs-best-practices`            | `kadajett/agent-nestjs-skills` (MIT), vendored    | developer, reviewer |
| `supabase-postgres-best-practices` | `supabase/agent-skills` (MIT), vendored           | developer, reviewer |

Vendored skills are pinned to a commit by `scripts/sync-skills.mjs` (`pnpm skills:sync`); don't edit them by hand.

## Example: event categories

**1. Analyze.**

```
/workflow analyze Add an optional `category` (enum: WEATHER, LOCAL_EVENT, PROMOTION, OTHER) to event impacts; admin can set it, dashboard returns it per event.
```

- Creates `features/event-category/requirement.md` with the contract change (additive: `category` on `EventImpact` and `DayEvent`), the migration (new enum + nullable column) and open questions, e.g. "Default for existing rows: NULL or OTHER?".

**2. Approve** → `/workflow approve event-category requirement`.

**3. Plan** → `/workflow plan event-category`:

| ID   | Title                                                     | Layer     | Depends on |
| ---- | --------------------------------------------------------- | --------- | ---------- |
| T-01 | Entity column + migration `AddEventCategory` + seed       | migration | —          |
| T-02 | zod schema + service/controller + dashboard payload + e2e | endpoint  | T-01       |
| T-03 | README API table                                          | docs      | T-02       |

Frontend follow-up (separate workflow in `../frontend/apps/admin`): add `category` to `@frontend/api-client` types and the event form.

**4. Approve the plan**, then `/workflow implement event-category T-01`. The reviewer returns PASS with e.g. `feat(database): add event category column` + `Refs: event-category T-01`.

**5. Commit** with `/workflow commit event-category T-01`. Repeat for T-02, T-03.
