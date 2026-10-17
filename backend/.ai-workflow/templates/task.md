# Tasks: <feature title>

- **Feature:** <slug> · **Requirement:** ./requirement.md
- **Status:** Draft <!-- Draft → Approved (only after explicit user approval) -->
- **Approved by / date:** —

## Overview

| ID   | Title | Layer                                   | Depends on |
| ---- | ----- | --------------------------------------- | ---------- |
| T-01 | …     | migration / module / endpoint / tests … | —          |

---

## T-01 — <title>

- **Scope (allowed paths):**
  - `src/<module>/...`
- **Depends on:** —
- **Dependencies to add:** none
- **Schema change:** none | migration `<Name>` (reversible: yes/no)
- **Contract change:** none | additive | breaking → frontend follow-up: <what>
- **Acceptance criteria:** (traces to requirement AC-x)
  - [ ] …
- **Tests:** unit `src/**/<name>.spec.ts` · e2e `test/<name>.e2e-spec.ts`
- **Verify:**
  - `pnpm check`
  - `pnpm test:e2e`
- **Commit:** `<type>(<scope>): <summary>`
