# Requirement: <title>

- **Slug:** <slug>
- **Status:** Draft <!-- Draft → Approved (set only after explicit user approval) -->
- **Approved by / date:** —
- **Source:** <user request | ../docs/US-TASK-DETAIL.md US-xx | frontend change>
- **Frontend impact:** none | `@frontend/api-client` types | `apps/client` | `apps/admin`

## Goal

<1–3 sentences: who needs what, and why.>

## Context / existing code

<Modules, entities, endpoints this builds on, with file paths.>

## API contract

<!-- One block per endpoint that is added or changed. Mark breaking changes explicitly. -->

```
METHOD /api/...           auth: public | admin session
Query/params: …
Body: { … }               (zod rules: …)
200/201/204: { … }
Errors: 400 { error, details } | 401 | 404 | 409 …
```

## Data model / migration

<Tables, columns (type, null, default), constraints, indexes. "none" if no schema change.>

## Acceptance criteria

- [ ] AC-1 …
- [ ] AC-2 …

## Out of scope

- …

## Open questions

- Q1 …
