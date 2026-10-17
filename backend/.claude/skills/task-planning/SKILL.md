---
name: task-planning
description: Break an approved backend requirement into small, ordered, verifiable tasks (migration → entity/service → controller → tests) with allowed file scope, dependencies, acceptance criteria and verification commands. Use for workflow phase "plan".
---

# Task planning (backend)

Output: `.ai-workflow/features/<slug>/tasks.md`, built from `.ai-workflow/templates/task.md`. Also fill in the Tasks table in `progress.md`.

## Preconditions

- `requirement.md` has `Status: Approved`. If it doesn't, stop.

## How to split

- One task = one reviewable diff of roughly 300 lines or fewer, leaving the app green (`pnpm check` + `pnpm test:e2e` pass after each task).
- Typical order:
  1. **Schema**: entity change + generated migration (+ registration in `src/database/migrations/index.ts`) + seed update if demo data changes.
  2. **Domain**: service logic, pure helpers with unit specs.
  3. **HTTP**: zod schemas + controller + e2e spec.
  4. **Docs**: README API table / CLAUDE.md when commands, env vars or endpoints change.
- Tests ship in the same task as the code they cover; never plan "add tests later".
- A new env var touches `src/config/app-config.ts` (or `database/seeds/seed-config.ts`), `.env.example`, `docs/SETUP.md` — same task.
- A new endpoint/error code touches `docs/API.md` and the Swagger path list in `test/e2e/platform.e2e-spec.ts` — same task.
- Never plan edits in `../frontend/`. If the contract changes, list the frontend follow-up (types in `@frontend/api-client`, mocks, forms) as an open item for the frontend workflow.
- Task IDs `T-01`, `T-02`, … are unique within the feature.

## Every task must have

Scope (allowed paths), Depends on, Dependencies to add (`none` or exact package + reason), Schema change, Contract change, Acceptance criteria (traced to AC-x), Tests, Verify, Commit. Use the template's format.

## Verify commands

- Always: `pnpm check` (format, lint, typecheck, unit tests, build) and `pnpm test:e2e` (real Postgres test database).
- Schema tasks also: `pnpm db:migrate` then `pnpm db:revert` then `pnpm db:migrate` on the dev database (proves `down` works).
- Endpoint tasks also: a `curl` against `pnpm dev` (http://localhost:4000/api/...) with the expected status/body.

## Commit

Conventional Commits, scope = the module (`auth`, `metrics`, `events`, `dashboard`, `database`, `config`, `common`) or `repo` for tooling/docs. Footer `Refs: <slug> T-xx`.

Leave `Status: Draft`.
