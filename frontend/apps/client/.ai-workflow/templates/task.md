# Tasks: <feature title>

- **Feature:** <slug> · **Requirement:** ./requirement.md
- **Status:** Draft <!-- Draft → Approved (only after explicit user approval) -->
- **Approved by / date:** —

## Overview

| ID   | Title | Target      | Depends on |
| ---- | ----- | ----------- | ---------- |
| T-01 | …     | @frontend/… | —          |

---

## T-01 — <title>

- **Target:** @frontend/<app-or-package>
- **Scope (allowed paths):**
  - `src/...`
- **Depends on:** —
- **Dependencies to add:** none
- **Affected consumers:** — <!-- for ../../packages/*: from the impact table in ../../CLAUDE.md -->
- **Acceptance criteria:** (traces to requirement AC-x)
  - [ ] …
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - Runtime (next-dev-loop): <route> — <what to check>
- **Commit:** `<type>(<scope>): <summary>`
