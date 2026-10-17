---
name: requirement-analysis
description: Turn a backend feature request, spec excerpt or frontend change into a testable requirement document (.ai-workflow/features/<slug>/requirement.md) with the API contract, data model and acceptance criteria. Use for workflow phase "analyze" or whenever a backend request must be clarified before planning.
---

# Requirement analysis (backend)

Output: `.ai-workflow/features/<slug>/requirement.md`, built from `.ai-workflow/templates/requirement.md`. The slug is short kebab-case.

## Inputs to read

1. The user's request and any files they pass.
2. Project spec: `../docs/US-TASK-DETAIL.md` — data model §1.1, API contract §1.2, backend stories EPIC 3 (US-11 – US-13).
3. The frontend's view of the contract: `../frontend/packages/api-client/src/types/` (DTOs) and, for admin forms, `../frontend/apps/admin/src/schemas/` (validation rules and messages the UI expects).
4. Existing backend code: `src/<module>/` (entities, services, controllers, schemas) and `src/database/migrations/`.

## What to pin down

- **Endpoints.** Method, path (always under `/api`), auth (public or admin session), query/params, body with every validation rule, success status and body, every error status with its `{ error, details? }`.
- **Compatibility.** Additive (new field/endpoint) or **breaking** (renamed/removed field, changed type or status). Breaking changes need a frontend follow-up and must be listed as such.
- **Data.** Tables/columns with types, nullability, defaults, constraints (CHECK, UNIQUE, FK), indexes, and how existing rows are migrated.
- **Calculations.** Exact rounding and edge cases (empty week, previous value 0 → `changePct: null`, dates without data → zeros).
- **Security.** Who may call it; what must never be returned (password hashes, internals).

## Rules

- Write acceptance criteria as observable, testable checklist items (AC-1, AC-2, …), each verifiable by an e2e request or a unit test.
- Write down what is out of scope.
- Don't design tasks and don't write code.
- Leave `Status: Draft`.
