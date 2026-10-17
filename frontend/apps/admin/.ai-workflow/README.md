# AI workflow — apps/admin

Run Claude Code **from `apps/admin`**:

```bash
cd apps/admin && claude
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

## Example: admin login (US-08)

**1. Analyze.**

```
/workflow analyze Admin login per US-08: /login form (email + password), redirect to / on success, guard all other routes, Logout button in the header.
```

- This creates `features/admin-login/requirement.md`.
- It asks open questions, for example "Should `/login` redirect to `/` when the user is already logged in?"

**2. Approve the requirement.** Answer the questions, then run `/workflow approve admin-login requirement`.

**3. Plan.** Run `/workflow plan admin-login`:

| ID   | Title                                                             | Target          | Depends on |
| ---- | ----------------------------------------------------------------- | --------------- | ---------- |
| T-01 | `Input` + `Label` form primitives                                 | @frontend/ui    | —          |
| T-02 | `/login` page + `LoginForm` (POST `/api/auth/login`, error state) | @frontend/admin | T-01       |
| T-03 | `src/proxy.ts` guard + `(dashboard)` layout with Logout           | @frontend/admin | T-02       |

- T-01 changes a shared package. Its Affected consumers are `@frontend/client` and `@frontend/admin`, and it is verified with `pnpm turbo run lint typecheck build --filter=...@frontend/ui`.
- T-02 and T-03 are verified with `--filter=@frontend/admin`, plus a manual check at http://localhost:3001.

**4. Approve the plan.** Run `/workflow approve admin-login plan`.

**5. Implement and review.** Run `/workflow implement admin-login T-01`. The reviewer returns PASS with a proposed message, for example `feat(ui): add input and label primitives` with the footer `Refs: admin-login T-01`.

**6. Commit.** Run `/workflow commit admin-login T-01` and confirm. Repeat for T-02 and T-03.
