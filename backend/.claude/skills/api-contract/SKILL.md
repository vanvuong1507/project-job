---
name: api-contract
description: The HTTP contract between this backend and the Next.js frontend (spec §1.2 and @frontend/api-client types) — endpoint list, response and error shapes, cookie/CORS rules, and how to make additive vs breaking changes. Use when adding or changing any endpoint, request field, response field or status code.
---

# API contract (backend ↔ frontend)

Sources of truth, which must agree:

- Spec: `../docs/US-TASK-DETAIL.md` §1.2.
- Frontend DTOs: `../frontend/packages/api-client/src/types/dashboard.ts`, `admin.ts`.
- Backend: zod schemas in `src/modules/*/dto/*.dto.ts` — input and response (`revenueTrendResponseSchema` mirrors the dashboard DTOs, `dailyMetricSchema`, `eventImpactSchema`, `adminUserSchema`). They also drive Swagger (`/api/docs`) and the e2e contract assertions.
- Human reference: `docs/API.md`.

## Endpoints (all under `/api`)

| Method | Path                             | Auth    | Success                                                     |
| ------ | -------------------------------- | ------- | ----------------------------------------------------------- |
| GET    | `/dashboard/revenue-trend`       | public  | 200 `RevenueTrendResponse` (`?weekStart=` Monday, optional) |
| POST   | `/auth/login`                    | public  | 200 `{ user }` + `Set-Cookie: admin_session`                |
| POST   | `/auth/logout`                   | public  | 204, clears cookie                                          |
| GET    | `/auth/me`                       | session | 200 `{ user }`                                              |
| GET    | `/admin/daily-metrics?from=&to=` | session | 200 `DailyMetric[]` sorted by date                          |
| POST   | `/admin/daily-metrics`           | session | 201 `DailyMetric` (409 if date exists)                      |
| PUT    | `/admin/daily-metrics/:id`       | session | 200 `DailyMetric` (404, 409)                                |
| DELETE | `/admin/daily-metrics/:id`       | session | 204 (404)                                                   |
| PUT    | `/admin/weeks/:weekStart`        | session | 200 `{ weekStart, days: DailyMetric[7] }` (upsert)          |
| GET    | `/admin/events?from=&to=`        | session | 200 `EventImpact[]` sorted by date                          |
| POST   | `/admin/events`                  | session | 201 `EventImpact`                                           |
| PUT    | `/admin/events/:id`              | session | 200 `EventImpact` (404)                                     |
| DELETE | `/admin/events/:id`              | session | 204 (404)                                                   |
| GET    | `/health`                        | public  | 200 `{ status: 'ok', database: 'up' }` / 503                |

Admin records also carry `createdAt`/`updatedAt` (ISO strings); the frontend ignores extra fields.

## Auth & roles

- Session token: HS256 JWT, `sub` = user id, `role` ∈ `ADMIN | VIEWER`, 1 day. Accepted from the `admin_session` cookie **or** `Authorization: Bearer <token>`.
- `AdminUser` = `{ id, email, name, role }` (`@frontend/api-client` `types/admin.ts`).
- Permissions (mirror of `../frontend/apps/admin/src/lib/permissions.ts`): ADMIN = all; VIEWER = `metrics:read`, `events:read`. Reads need `*:read`; daily-metrics/weeks writes need `metrics:write`; event create/update `events:write`; event delete `events:delete`.
- No/invalid token → `401` `UNAUTHORIZED`; insufficient role → `403` `FORBIDDEN`.
- Login lockout → `429` `LOGIN_LOCKED` + `Retry-After` (seconds).

## Shapes that must not drift

- Success: bare resource / array, never an envelope. Lists send `X-Total-Count`; creates answer `201` with `Location`.
- Errors: `{ statusCode, code, error, details?, requestId, path, timestamp }`. `error` (human message) and `details` (`{ "<dotted.path>": string[] }`, e.g. `days.0.covers`, only for `VALIDATION_FAILED`) are what the frontend's `ApiError` reads — never rename/remove them. Clients branch on `code` (`common/exceptions/error-codes.ts`).
- Dates `YYYY-MM-DD`; money as JSON numbers (≤ 2 decimals); `changePct` is a number with 1 decimal or `null` when previous = 0.
- Dashboard always returns exactly 7 days, Mon→Sun, zero-filled; KPIs are computed here, never on the client.

## Cookies & CORS

- `admin_session`: httpOnly, SameSite=Lax, Path=/, 1 day, `Secure` when `COOKIE_SECURE`/production. Host-only, so it is shared by `localhost:3001` (admin) and `localhost:4000` (API) — cookies ignore ports.
- CORS: `WEB_ORIGINS` (default `http://localhost:3000,http://localhost:3001`), `credentials: true`. The client app calls the API server-side only; the admin app calls it from the browser with `credentials: 'include'`.

## Changing the contract

- **Additive** (new endpoint, new optional field): implement + e2e test, then note the frontend follow-up (add the field to `@frontend/api-client` types).
- **Breaking** (rename/remove/retype a field, change a status code or error shape): only with explicit approval in the requirement; list every frontend consumer to update (`api-client` types, `apps/client` mock builder, `apps/admin` mocks/forms) as a follow-up task for the frontend workflow.
- Keep `src/modules/dashboard/dto/revenue-trend.dto.ts` identical in meaning to the frontend's `types/dashboard.ts`.
- E2E tests assert exact bodies for these shapes — update them in the same task.
