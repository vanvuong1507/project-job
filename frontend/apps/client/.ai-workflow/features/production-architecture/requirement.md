# Requirement: Production-grade App Router architecture (client)

- **Slug:** production-architecture
- **Status:** Approved <!-- Draft → Approved (set only after explicit user approval) -->
- **Approved by / date:** user, 2026-10-16 ("duyệt")
- **Source:**
  - User request (2026-10-16): review `apps/`; refactor it to current Next.js / App Router standards; add production config; evaluate zustand and React Query; add i18n, theme switching, interceptors, roles/permissions and the other standard production setup.
  - Bundled Next 16.4 docs: `backend-for-frontend.md`, `data-security.md`, `authentication.md`, `production-checklist.md`, `internationalization.md`, `content-security-policy.md`, `instrumentation.md`.
- **Targets:** @frontend/client, plus the shared packages `@frontend/api-client` (interceptors), `@frontend/ui` and `@frontend/tailwind-config` (theme), and a new `@frontend/i18n`.

## Goal

Keep every behaviour of the dashboard (revenue-trend-dashboard, AC-1…AC-17), but restructure the app to the patterns Next 16 documents for production:

- server-side data access (no self-HTTP);
- URL-driven view state;
- i18n;
- light, dark and system themes;
- observability and hardened config.

## Review findings (current code)

| #   | Finding                                                                                                                                                                                                 | Evidence                                          | Standard                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | **The Server Component fetches its own Route Handler over HTTP.** `page.tsx` → `getRevenueTrend()` → `api.get('http://localhost:3000/api/…')`.                                                          | `features/revenue-trend/api/get-revenue-trend.ts` | backend-for-frontend.md: _"Fetch data in Server Components directly from its source, not via Route Handlers"_; this adds an extra round trip and fails at build time for prerendered routes. |
| C2  | **Mock Route Handlers ship in the production bundle** with no gate.                                                                                                                                     | `src/app/api/dashboard/**`, `src/mocks/**`        | Mocks must be dev/test-only, or explicitly enabled.                                                                                                                                          |
| C3  | **No `server-only` boundary.** Data and mock modules could be imported by client code.                                                                                                                  | `src/mocks`, `features/*/api`                     | data-security.md: a DAL marked `import 'server-only'`, returning DTOs.                                                                                                                       |
| C4  | **View state isn't in the URL.** Compare mode and series live in `useState`, so they can't be shared or bookmarked, and the back button doesn't restore them.                                           | `revenue-trend-card.tsx`                          | Search params as state.                                                                                                                                                                      |
| C5  | **Expected errors use try/catch around a fetch.** The 400 → message mapping lives in the page instead of validating `searchParams` first.                                                               | `app/page.tsx`                                    | Validate input at the boundary (zod) before any data access.                                                                                                                                 |
| C6  | **Missing production files:** `global-error.tsx`, `robots.ts`, `sitemap.ts`, `metadataBase` + OG image, icons/manifest, `instrumentation.ts` (`onRequestError`), web-vitals reporting, health endpoint. | `src/app`                                         | production-checklist.md                                                                                                                                                                      |
| C7  | **No i18n, no theme switching.** Copy is hard-coded in components.                                                                                                                                      | all components                                    | —                                                                                                                                                                                            |
| C8  | **The HTTP client has no interceptors.** No request id, auth header injection, logging, retry or central error handling.                                                                                | `@frontend/api-client`                            | —                                                                                                                                                                                            |
| C9  | **Security headers lack a CSP**, and there is no `standalone` output or Docker image.                                                                                                                   | `@frontend/next-config`                           | content-security-policy.md, self-hosting.md                                                                                                                                                  |

## Project structure (answer to "is `features/` correct App Router?")

Per `01-getting-started/02-project-structure.md`, Next.js is **unopinionated**. "Store project files outside of `app`" (where `app` is routing only) is one of the documented strategies, so `src/features/` is valid. The requirement is to **pick one strategy and apply it consistently**, which the current code doesn't do (see the findings). The rules adopted for both apps:

```
src/
  app/[locale]/                      routing only: layout, page, loading, error, not-found, route groups
    (<area>)/<route>/_components/    private folder: UI used by this route only (colocated)
  features/<domain>/                 a domain module reused across routes; public API via index.ts
    components/                      server components plus small 'use client' islands
    actions.ts                       'use server' mutations (admin)
    schemas.ts                       zod schemas shared by actions and forms
  server/                            import 'server-only': DAL, data sources, session/authz, logger
  components/                        app-wide UI (shell, providers, locale/theme switchers)
  lib/                               pure, isomorphic helpers (no env, no I/O)
  i18n/                              next-intl routing, request config, messages/{en,vi}.json
```

- `server/` is the only place that reads secret env vars or touches data sources. Components never import from `mocks/` or `server/*/sources/*` directly.
- A file under `features/` must not import from `app/`. Route `_components` may import from `features/`, `components/` and `lib/`, but not from each other's routes.

Client mapping:

- `features/revenue-trend/{components,lib,hooks}` stays: the dashboard domain.
- `get-revenue-trend.ts` moves to `server/revenue-trend/` (DAL plus `sources/{mock,api}.ts`), and `mocks/` becomes `server/revenue-trend/sources/mock/`.
- The page lives at `app/[locale]/page.tsx`.
- The header controls (locale and theme switchers) go in `components/`.

## State management evaluation (requested: zustand, React Query)

Inventory of the state these apps actually hold:

| State                              | Where it lives today        | Correct home in App Router                                    |
| ---------------------------------- | --------------------------- | ------------------------------------------------------------- |
| Dashboard data, admin lists, user  | fetched (badly, see review) | **Server**: RSC reads through the DAL; no client cache needed |
| Mutations (save week, CRUD events) | client `fetch` + `refresh`  | **Server Actions** + `useActionState` + `revalidatePath`      |
| Compare mode, visible series, week | `useState` / URL            | **URL search params** (shareable, SSR-correct, back button)   |
| Form drafts, dialogs, toasts       | local `useState` / context  | stays local (already correct)                                 |
| Theme, locale                      | —                           | `next-themes` (cookie/localStorage) and the i18n routing      |
| Sidebar collapsed, UI preferences  | —                           | small, persisted, cross-tree → the only zustand candidate     |

- **React Query: not recommended.** Its value is client-side caching, background refetch, polling, infinite queries and optimistic cache updates. Here every read is a Server Component and every write is a Server Action. React's `useOptimistic` covers the optimistic UI. Adding it would create a second cache that has to be kept in sync with the router cache. Revisit it if a screen needs polling or live client-side filtering.
- **zustand: not needed now.** No server state belongs in it, and the URL / local state cover everything else. If persisted UI preferences (for example a collapsed sidebar) appear, one small `zustand/persist` store is acceptable. It must be created **per request via a provider**, not as a module singleton, to stay safe with RSC and SSR.

URL state for compare and series uses the native `useSearchParams` + `router.replace`. No new library is needed (`nuqs` would also work, but it isn't justified for 2 params).

## Acceptance criteria

**Architecture (App Router)**

- [ ] AC-1: The code follows the project structure rules above. `src/app/[locale]` contains routing only, and every `src/server/**` module has `import 'server-only'`. An ESLint `no-restricted-imports` rule enforces the boundaries: client components can't import `@/server/*`, and `features` can't import `@/app/*`.
- [ ] AC-2: The dashboard reads data through a DAL function (`server/revenue-trend.ts`) that returns a DTO. No Server Component calls a Route Handler.
- [ ] AC-3: The data source is chosen by server env `DATA_SOURCE=mock|api` behind one `RevenueTrendSource` interface:
  - `mock`: in-process fixtures (today's logic);
  - `api`: the real backend over HTTP via `@frontend/api-client`, at `API_URL` (server-only).

  The default is `mock` in development and test. A production build with `DATA_SOURCE=mock` must be an explicit choice.

- [ ] AC-4: The mock Route Handler `GET /api/dashboard/revenue-trend` stays available as JSON for browsers and tools, served from the same DAL. It returns 404 unless `ENABLE_MOCK_API=true`, which is on by default in dev and test.
- [ ] AC-5: `?weekStart` is validated with zod in the page before data access.
  - Invalid → the inline "can't be shown" state (unchanged UX).
  - Unexpected errors → `error.tsx` (`retry`).
  - Uncaught errors → `global-error.tsx`.
- [ ] AC-6: The compare mode and the visible series are in the URL (`?compare=0`, `?series=pos,labour`). Defaults are omitted from the URL. Changing them uses `router.replace` with `scroll: false`, and they survive reload and back/forward. Export PNG and the KPI rules are unchanged.

**i18n**

- [ ] AC-7: Locales `en` (default) and `vi`. Routing uses a `[locale]` segment, with `as-needed` prefix (see Q1). Negotiation happens in `proxy.ts` (cookie, then `Accept-Language`). `<html lang>` is set per locale.
- [ ] AC-8: All UI copy comes from typed message catalogs. Numbers, currency and dates are formatted per locale. A missing key fails typecheck, and `vi` has full coverage (checked by a unit test).
- [ ] AC-9: A locale switcher in the header keeps the current path and query.

**Theme**

- [ ] AC-10: Light, dark and system themes via `next-themes` (`class` strategy, no flash on load).
- [ ] AC-11: Dark values exist for every semantic token in `theme.css`, overriding the semantic `--color-*` under `.dark`. Chart colours stay distinguishable. The theme toggle lives in the header, and is keyboard- and screen-reader-accessible.

**HTTP client (shared)**

- [ ] AC-12: `@frontend/api-client` gets an interceptor pipeline: `onRequest` (headers such as `x-request-id`, `Accept-Language`, auth), `onResponse`, and `onError` (normalised `ApiError`). Idempotent GETs retry with backoff on network errors and 5xx, configurable. There are unit tests for ordering, retries and the error shape.

**Production setup**

- [ ] AC-13: Metadata:
  - `metadataBase` (from the env `NEXT_PUBLIC_SITE_URL`);
  - a title template per locale;
  - Open Graph and Twitter metadata, plus a generated `opengraph-image`;
  - `icon` and `manifest`;
  - `robots.ts` and `sitemap.ts`, with `alternates` per locale.
- [ ] AC-14: Observability:
  - `instrumentation.ts` with `register` and `onRequestError`, using a structured JSON logger (`server/logger.ts`, with the request id);
  - `useReportWebVitals`, which logs in dev and can send to an endpoint.
- [ ] AC-15: Config: `.env.example` documents every variable, validated in `env.ts` with server and client separated. Secret and server variables are read only under `server/`.
- [ ] AC-16: All existing E2E specs still pass, updated for locale prefixes and URL state. New E2E specs cover locale switching (`vi` copy and number formats), theme toggling (persisted, no flash) and the URL state round-trip.
- [ ] AC-17: `pnpm check` and `pnpm test:e2e` (dev and `CI=1`) pass. The bundled docs' recommendations above are followed; deviations are listed in `progress.md`.

## Out of scope

- A real backend. Auth/RBAC on the client: the public dashboard has no users. RBAC is in the admin requirement.
- React Query and zustand (see the evaluation above). Analytics vendors and Sentry: only the hook points are added, with no vendor SDK.
- **Deferred by the user (2026-10-16):** Docker / `standalone` / health endpoint, CSP (static or nonce), git hooks + commitlint, Renovate.
- Cache Components / PPR adoption. That would be a separate migration; the dashboard stays dynamic and uncached by design.

## Decisions (user, 2026-10-16)

- **Q1/Q2 → next-intl, `en` (default) + `vi`.** A `[locale]` segment with the `as-needed` prefix.
- **Q3 → Light / Dark / System.** The dark palette is designed by us on the semantic tokens.
- **Q4/Q5 → deferred.** CSP, Docker/standalone/health, git hooks and Renovate are out of scope for now.
- **Project structure →** the rules in "Project structure" above; the user asked for `features/` to be reviewed against App Router standards.
