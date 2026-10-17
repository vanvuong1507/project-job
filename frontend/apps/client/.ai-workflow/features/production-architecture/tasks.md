# Tasks: Production-grade App Router architecture (client)

- **Feature:** production-architecture · **Requirement:** ./requirement.md (Approved 2026-10-16)
- **Status:** Approved <!-- Draft → Approved (only after explicit user approval) -->
- **Approved by / date:** user, 2026-10-16 ("duyệt")

## Overview

| ID   | Title                                                                                                             | Target                                  | Depends on       |
| ---- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------- |
| T-01 | HTTP client interceptors + retry                                                                                  | @frontend/api-client                    | —                |
| T-02 | Dark theme tokens, the `dark:` variant and a Storybook theme switch                                               | @frontend/tailwind-config, @frontend/ui | —                |
| T-03 | New `@frontend/i18n` package: locales, shared `common` messages, completeness helper                              | @frontend/i18n (new)                    | —                |
| T-04 | Server DAL with `mock`/`api` sources, `server-only`, gated mock API, import boundaries                            | @frontend/client                        | T-01             |
| T-05 | next-intl: `[locale]` routing, proxy negotiation, catalogs, locale switcher                                       | @frontend/client                        | T-03, T-04       |
| T-06 | Theme: next-themes provider, theme toggle, chart in dark                                                          | @frontend/client                        | T-02, T-05       |
| T-07 | Compare mode and series in the URL                                                                                | @frontend/client                        | T-05             |
| T-08 | Production files: `global-error`, metadata/OG/icons/manifest/robots/sitemap, instrumentation + logger, web vitals | @frontend/client                        | T-05             |
| T-09 | E2E migration + new locale/theme/URL-state specs, docs and skills                                                 | @frontend/client                        | T-06, T-07, T-08 |

T-01…T-03 are **shared** and come first. The admin plan (admin → production-architecture) depends on them and doesn't repeat them.

### Target structure (requirement → Project structure)

```
src/
  app/
    [locale]/layout.tsx · page.tsx · loading.tsx · error.tsx · not-found.tsx · opengraph-image.tsx
    api/dashboard/revenue-trend/route.ts   mock JSON API (gated by ENABLE_MOCK_API)
    global-error.tsx · robots.ts · sitemap.ts · manifest.ts · icon.svg
  proxy.ts                                 next-intl locale negotiation
  instrumentation.ts                       register + onRequestError → logger
  i18n/                                    routing.ts · request.ts · navigation.ts · messages/{en,vi}.json
  features/revenue-trend/                  components/ · hooks/ · lib/ (unchanged domain code)
  server/                                  'server-only'
    logger.ts
    revenue-trend/index.ts                 DAL: getRevenueTrend(weekStart) → DTO
    revenue-trend/sources/{mock,api}.ts    RevenueTrendSource implementations
    revenue-trend/sources/mock/…           today's src/mocks (fixtures, dates, builder + tests)
  components/                              providers.tsx · site-header.tsx · locale-switcher.tsx · theme-toggle.tsx · web-vitals.tsx
  env.ts · lib/
```

---

## T-01 — HTTP client interceptors + retry

- **Target:** @frontend/api-client
- **Scope (allowed paths):** `../../packages/api-client/src/**`, `../../packages/api-client/package.json`, `../../packages/api-client/vitest.config.ts`, `../../pnpm-lock.yaml`
- **Depends on:** —
- **Dependencies to add:** `vitest` (dev, catalog), for unit tests of the request pipeline.
- **Affected consumers:** `@frontend/client`, `@frontend/admin`
- **Acceptance criteria:** (AC-12)
  - [ ] `createHttpClient({ …, interceptors: { request?, response?, error? }[], retry? })`. Request interceptors run in order and may modify a `Request`-like context (URL, headers). Response interceptors see the `Response`. Error interceptors may transform the `ApiError` or recover from it.
  - [ ] Built-in helpers: `requestIdInterceptor()` sets `x-request-id`; `headersInterceptor(() => headers)` covers `Accept-Language`, `Authorization` and similar.
  - [ ] `retry: { attempts, baseDelayMs }` retries only GET/HEAD on network errors and 502/503/504, with exponential backoff. Non-idempotent methods never retry.
  - [ ] The existing API and behaviour are unchanged (timeouts, `ApiError`, JSON handling).
  - [ ] Unit tests cover interceptor order, header injection, error transform, retry/no-retry rules and backoff (fake timers).
- **Verify:**
  - `pnpm --filter @frontend/api-client test`
  - `pnpm turbo run lint typecheck build --filter=...@frontend/api-client`
- **Commit:** `feat(api-client): add interceptor pipeline and idempotent retry`

## T-02 — Dark theme tokens + Storybook theme switch

- **Target:** @frontend/tailwind-config (plus the @frontend/ui Storybook config)
- **Scope (allowed paths):** `../../packages/tailwind-config/{theme.css,base.css}`, `../../packages/ui/.storybook/**`, `../../packages/ui/src/theme/tokens.test.ts`
- **Depends on:** —
- **Dependencies to add:** none. Storybook switches the theme with a toolbar global and decorator that toggles `.dark`, so no addon is needed.
- **Affected consumers:** `@frontend/client`, `@frontend/admin`, `ui` Storybook
- **Acceptance criteria:** (AC-10, AC-11)
  - [ ] `theme.css` adds `.dark { --color-…: … }` overrides for **every** semantic token, using new dark primitives (`--palette-*`). Text/background contrast is at least WCAG AA 4.5:1, and chart series stay distinguishable on the dark surface.
  - [ ] `base.css` declares `@custom-variant dark (&:where(.dark, .dark *));` and `color-scheme` per theme.
  - [ ] `tokens.test.ts` also asserts that every semantic token has a dark override.
  - [ ] Storybook has a Light/Dark toolbar switch, and the a11y panel is clean in both themes for the existing stories.
- **Verify:**
  - `pnpm --filter @frontend/ui test`
  - `pnpm turbo run lint typecheck build --filter=...@frontend/tailwind-config`
  - `pnpm build-storybook`
- **Commit:** `feat(tailwind-config): add dark theme tokens`

## T-03 — `@frontend/i18n` package

- **Target:** @frontend/i18n (new package in `../../packages/i18n`)
- **Scope (allowed paths):** `../../packages/i18n/**`, `../../pnpm-lock.yaml`, `../../pnpm-workspace.yaml` (catalog), `../../packages/next-config/index.js` (add it to `WORKSPACE_PACKAGES`)
- **Depends on:** —
- **Dependencies to add:** `vitest` (dev). The package uses `next-intl` only for types (peer).
- **Affected consumers:** `@frontend/client`, `@frontend/admin`
- **Acceptance criteria:** (AC-7, AC-8)
  - [ ] Exports `LOCALES = ['en', 'vi']`, `DEFAULT_LOCALE = 'en'`, `type Locale`, `isLocale()`, and `LOCALE_LABELS` (`English`, `Tiếng Việt`).
  - [ ] Shared `common` messages in en and vi: theme labels (Light/Dark/System), locale switcher labels, generic errors (retry, network, not found, something went wrong).
  - [ ] `findMissingKeys(base, other)` helper for app catalog completeness tests, with unit tests.
  - [ ] It follows the repo conventions: raw TS exports, ESLint/TS configs, and it is listed in `WORKSPACE_PACKAGES`.
- **Verify:**
  - `pnpm --filter @frontend/i18n test`
  - `pnpm turbo run lint typecheck build --filter=...@frontend/i18n`
- **Commit:** `feat(i18n): add shared locale config and common messages`

## T-04 — Server DAL, data sources, gated mock API, boundaries

- **Target:** @frontend/client
- **Scope (allowed paths):** `src/server/**`, `src/mocks/**` (moved into `src/server/revenue-trend/sources/mock/`), `src/features/revenue-trend/api/**` (removed), `src/app/page.tsx`, `src/app/api/**`, `src/env.ts`, `.env.example`, `.env`, `eslint.config.js`, `vitest.config.ts`, `package.json`, `../../pnpm-lock.yaml`, `e2e/api.spec.ts`
- **Depends on:** T-01
- **Dependencies to add:** `server-only`, to make importing these modules from client code a build error.
- **Affected consumers:** —
- **Acceptance criteria:** (AC-1…AC-5)
  - [ ] `server/revenue-trend/index.ts` (`import 'server-only'`) exports `getRevenueTrend(weekStart?)`, which returns the `RevenueTrendResponse` DTO through a `RevenueTrendSource` chosen by `env.DATA_SOURCE` (`mock` | `api`, default `mock`).
  - [ ] The `api` source uses `createHttpClient` with `API_URL` (server-only), `requestIdInterceptor` and `retry`.
  - [ ] `page.tsx` calls the DAL directly (no self-HTTP). Expected/unexpected error handling is unchanged.
  - [ ] `GET /api/dashboard/revenue-trend` is served from the same DAL. It returns 404 when `ENABLE_MOCK_API` isn't `true` (default true in dev/test via `.env.example`).
  - [ ] `env.ts`: `DATA_SOURCE`, `API_URL` (required when `DATA_SOURCE=api`), `ENABLE_MOCK_API`. `NEXT_PUBLIC_API_URL` is removed, since the browser never calls the API now. Everything is documented in `.env.example`.
  - [ ] ESLint `no-restricted-imports`:
    - `@/server/*` is forbidden in `'use client'` files and in `src/features/**/components`;
    - `src/features/**` can't import `@/app/*`.
  - [ ] The existing unit tests still pass (moved with the mock), and the existing E2E specs pass unchanged.
- **Verify:**
  - `pnpm test`
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - `pnpm test:e2e`
  - Runtime: `/` renders with no outgoing request to `/api/*` (dev log / MCP `get_errors` clean); `/api/dashboard/revenue-trend` returns 404 when `ENABLE_MOCK_API=false`.
- **Commit:** `refactor(client): read dashboard data through a server-only DAL`

## T-05 — next-intl, `[locale]` routing, catalogs, switcher

- **Target:** @frontend/client
- **Scope (allowed paths):** `src/app/**` (moved under `src/app/[locale]/`), `src/i18n/**`, `src/proxy.ts`, `src/components/{site-header,locale-switcher}.tsx`, `src/features/revenue-trend/**` (copy → `useTranslations`/`getTranslations`, `useFormatter`), `next.config.ts`, `package.json`, `../../pnpm-lock.yaml`, `../../pnpm-workspace.yaml`, `src/i18n/messages.test.ts`
- **Depends on:** T-03, T-04
- **Dependencies to add:** `next-intl` (catalog), per user decision Q1.
- **Affected consumers:** —
- **Acceptance criteria:** (AC-7, AC-8, AC-9)
  - [ ] Routing:
    - `defineRouting({ locales, defaultLocale: 'en', localePrefix: 'as-needed' })`: `/` is English and `/vi` is Vietnamese;
    - `proxy.ts` uses next-intl's middleware for negotiation (cookie → `Accept-Language`) and excludes `api`, `_next` and static files.
  - [ ] Layout:
    - `[locale]/layout.tsx` sets `<html lang>`, `generateStaticParams` and `setRequestLocale`;
    - an invalid locale → `notFound()`.
  - [ ] Copy:
    - every user-visible string (title, legend, KPI labels, states, export, tooltips) comes from `messages/{en,vi}.json`, merged with `common` from `@frontend/i18n`;
    - currency, numbers and dates use the locale (`vi`: `15.974 US$`-style via next-intl `format`).
    - The chart axis keeps the `k` notation in both locales.
  - [ ] Message keys are type-checked (next-intl `AppConfig`). `messages.test.ts` asserts that `vi` has every `en` key.
  - [ ] `LocaleSwitcher` (in the site header) switches locale and keeps the path and query.
- **Verify:**
  - `pnpm test`
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - `pnpm test:e2e` (existing specs updated where copy or URLs changed)
  - Runtime: `/` is English, `/vi` is Vietnamese with vi number formats, and switching keeps `?weekStart`.
- **Commit:** `feat(client): add en/vi localisation with next-intl`

## T-06 — Theme: provider, toggle, dark chart

- **Target:** @frontend/client
- **Scope (allowed paths):** `src/components/{providers,theme-toggle,site-header}.tsx`, `src/app/[locale]/layout.tsx`, `src/features/revenue-trend/components/**` (only where colours need theme-aware tokens), `src/i18n/messages/*.json`, `package.json`, `../../pnpm-lock.yaml`, `../../pnpm-workspace.yaml`
- **Depends on:** T-02, T-05
- **Dependencies to add:** `next-themes` (catalog), per user decision Q3.
- **Affected consumers:** —
- **Acceptance criteria:** (AC-10, AC-11)
  - [ ] `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`). There is no flash on load (`suppressHydrationWarning` on `<html>`).
  - [ ] `ThemeToggle` offers Light / Dark / System with labels from `common`, is keyboard-accessible and announces the current theme.
  - [ ] The chart, markers, tooltips and export render correctly in dark (tokens only, no hex). The Export PNG background follows the theme surface.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - `pnpm test:e2e`
  - Runtime: the toggle switches instantly and persists across reload; system follows the OS; screenshots light vs dark are reviewed.
- **Commit:** `feat(client): add light, dark and system themes`

## T-07 — Compare mode and series in the URL

- **Target:** @frontend/client
- **Scope (allowed paths):** `src/features/revenue-trend/{components,hooks,lib}/**`, `src/app/[locale]/page.tsx`, `src/server/revenue-trend/**` (search-param parsing only, if shared), `e2e/revenue-trend.spec.ts`
- **Depends on:** T-05
- **Dependencies to add:** none (native `useSearchParams` + `router.replace`)
- **Affected consumers:** —
- **Acceptance criteria:** (AC-6)
  - [ ] `?compare=0` turns compare off, and `?series=pos,labour` sets the visible series. Default values are omitted from the URL, and unknown or empty values fall back to the defaults (at least 1 series).
  - [ ] Toggling updates the URL with `router.replace(…, { scroll: false })`, without a server round-trip for data. The page renders the initial state from `searchParams`, so SSR matches the client.
  - [ ] A pure `parseViewState` / `serializeViewState` pair has unit tests. The E2E spec covers a reload round-trip and the back button.
- **Verify:**
  - `pnpm test`
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - `pnpm test:e2e`
  - Runtime: `/?compare=0&series=pos` renders that state on first paint with no hydration warnings.
- **Commit:** `feat(client): keep dashboard view state in the URL`

## T-08 — Production files

- **Target:** @frontend/client
- **Scope (allowed paths):** `src/app/{global-error.tsx,robots.ts,sitemap.ts,manifest.ts,icon.svg}`, `src/app/[locale]/{layout.tsx,opengraph-image.tsx}`, `src/instrumentation.ts`, `src/server/logger.ts`, `src/components/web-vitals.tsx`, `src/env.ts`, `.env.example`
- **Depends on:** T-05
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:** (AC-13, AC-14, AC-15)
  - [ ] `metadataBase` comes from `NEXT_PUBLIC_SITE_URL`. There is a localized title template and description per locale, plus `alternates.languages` (en, vi).
  - [ ] `opengraph-image.tsx` (ImageResponse), `icon.svg`, `manifest.ts`; `robots.ts` (allow all, sitemap URL); `sitemap.ts` (`/`, `/vi`).
  - [ ] `global-error.tsx`: its own `<html>` and `<body>`, a `retry` button and a minimal inline style. It works without globals.
  - [ ] `instrumentation.ts`: `register` logs the startup config (no secrets), and `onRequestError` logs `{ path, method, digest, requestId }` through `server/logger.ts` (JSON lines in production, pretty in dev).
  - [ ] `WebVitals` (`useReportWebVitals`) logs in dev and posts to `NEXT_PUBLIC_VITALS_URL` when set.
- **Verify:**
  - `pnpm turbo run lint typecheck build --filter=@frontend/client`
  - `curl` `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/opengraph-image`
  - Runtime: forcing a server error logs a structured line with the digest.
- **Commit:** `feat(client): add seo metadata, global error and instrumentation`

## T-09 — E2E migration, new specs, docs

- **Target:** @frontend/client
- **Scope (allowed paths):** `e2e/**`, `CLAUDE.md` (app), `.claude/skills/{nextjs-frontend,ui-implementation,task-planning}/SKILL.md` (architecture rules), `.ai-workflow/templates/task.md`
- **Depends on:** T-06, T-07, T-08
- **Dependencies to add:** none
- **Affected consumers:** —
- **Acceptance criteria:** (AC-16, AC-17)
  - [ ] All previous specs pass, migrated to locale-aware URLs.
  - [ ] New specs:
    - `/vi` shows Vietnamese copy and vi number formats; switching keeps the query;
    - the theme toggle persists across reload and applies `.dark`;
    - URL state round-trip;
    - the mock API returns 404 when disabled (a config-level check via an env override where feasible; otherwise a unit test).
  - [ ] The app `CLAUDE.md` and skills describe the new structure (app/server/features/components/lib/i18n), the DAL and data sources, i18n, theme and URL-state rules.
  - [ ] `pnpm check` and `pnpm test:e2e` pass in dev and with `CI=1`.
- **Verify:**
  - `pnpm check` (repo root)
  - `pnpm test:e2e`
  - `pnpm build && CI=1 pnpm test:e2e`
- **Commit:** `test(client): cover locales, themes and url state; document the architecture`
