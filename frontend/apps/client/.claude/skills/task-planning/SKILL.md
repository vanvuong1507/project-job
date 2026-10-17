---
name: task-planning
description: Break an approved apps/client requirement into small, ordered, verifiable tasks with target package, allowed file scope, dependencies, acceptance criteria and verification commands. Use for workflow phase "plan".
---

# Task planning (apps/client)

Output: `.ai-workflow/features/<slug>/tasks.md`, built from `.ai-workflow/templates/task.md`. Also fill in the Tasks table in `progress.md`.

## Preconditions

- `requirement.md` has `Status: Approved`. If it doesn't, stop.

## How to split

- One task means one target and a reviewable diff of roughly 300 lines or fewer.
- The default target is `@frontend/client`, with Scope paths under `src/`, `public/` or this app's config files.
- A task may target a shared package (`@frontend/ui`, `@frontend/api-client`, `@frontend/tailwind-config`) only when the requirement needs it:
  - its Scope paths start with `../../packages/<pkg>/`;
  - it must list `@frontend/admin` under Affected consumers;
  - it must come before the app tasks that depend on it.
- Put a component in `@frontend/ui` only if `admin` needs it too. Otherwise keep it in `src/components/`.
- Never plan edits in `../admin/`. Report that need as an open item instead.
- Use task IDs `T-01`, `T-02`, … ; they are unique within the feature.

## Every task must have

Target, Scope (allowed paths), Depends on, Dependencies to add (`none` or the exact package and the reason), Acceptance criteria (traced to AC-x), Affected consumers, Verify, Commit. Use the template's format.

## Verify commands

These are run from `apps/client`.

- App-only:
  ```
  pnpm turbo run lint typecheck build --filter=@frontend/client
  ```
- Shared package:
  ```
  pnpm turbo run lint typecheck build --filter=...@frontend/<pkg>
  ```
  This also checks `@frontend/admin`.
- Runtime: name the route and what to check (for example "`/` shows 3 KPI cards, no errors"). The developer verifies it with the `next-dev-loop` skill against `pnpm dev` (http://localhost:3000).
- Unit: pure logic in this app (`src/**/lib`, `src/server/**`) gets Vitest tests next to it, verified with `pnpm test`.
- i18n: any task that adds copy lists `src/i18n/messages/{en,vi}.json` in its Scope.
- E2E: add or extend specs in `e2e/` within the task's Scope for every user-visible flow, and verify with `pnpm test:e2e`. Logic in `@frontend/ui` (hooks, formatters, stateful components) gets Vitest tests next to it, verified with `pnpm --filter @frontend/ui test`.
- A `@frontend/ui` task creates or updates the component folder `src/components/<name>/` (`<name>.tsx`, `<name>.stories.tsx`, `index.ts`), re-exports it from `src/index.ts`, and adds `pnpm build-storybook` to Verify.

Leave `Status: Draft`.
