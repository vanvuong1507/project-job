---
name: nextjs-frontend
description: Conventions for Next.js 16 (App Router) + React 19 code in apps/client — the public dashboard: server-only DAL with mock/api sources, URL-backed view state, next-intl ([locale]), next-themes, client-component boundaries for chart interactivity, env and observability. Use whenever implementing or reviewing code in this app.
---

# Next.js conventions (apps/client)

Next 16 changed several APIs. For anything not covered here, read the bundled docs in `node_modules/next/dist/docs/` (see `AGENTS.md`, which `next dev` writes) rather than relying on memory.

## Structure

- `src/app/[locale]/…` is routing only. Domain code goes in `src/features/<domain>/{components,hooks,lib}`. App-wide UI goes in `src/components/`, pure helpers in `src/lib/`, and data access in `src/server/` (`import 'server-only'`).
- Route-only UI may be colocated in a private `_components/` folder next to its route.
- ESLint blocks `@/server/*` and `@/app/*` imports from `features/`, `components/` and `lib/`. Pass data down as props from a Server Component.

## Data

- Pages are Server Components that call DAL functions, for example `getRevenueTrend(weekStart)` from `@/server/revenue-trend`. **Never** fetch this app's own Route Handlers from the server.
- Validate `searchParams` at the page boundary before calling the DAL.
- A new data need means a DAL function plus a method on the source interface, implemented in both `sources/mock` and `sources/api`. The `api` source uses `createHttpClient` with interceptors and retry.
- Route Handlers are for external or browser consumers only, and the mock ones are gated by `ENABLE_MOCK_API`.

## Client components

- Keep `'use client'` on leaf islands (the card's interactivity, chart, switchers).
- View state that should be shareable goes in the URL, through `history.replaceState` (see `useViewState`), not `useState` and not `router.replace`.
- Load heavy browser-only libraries (Recharts, `html-to-image`) only in client components, or on demand.

## i18n & theme

- Copy comes from `src/i18n/messages/{en,vi}.json` via `useTranslations`/`getTranslations`; shared keys live under `common.*` (from `@frontend/i18n`). Add every key to both catalogs; the test enforces it.
- Navigation uses `Link`, `useRouter` and `usePathname` from `@/i18n/navigation`, so the locale prefix is preserved.
- Numbers and currency use the `@frontend/ui` formatters with `useLocale()`. Dates are in UTC. Don't use `Intl.formatRange` in rendered output (hydration).
- Theme: semantic tokens only; dark mode is automatic through `.dark`.

## Env

- Read env only through `import { env } from '@/env'`. Server-only variables (`DATA_SOURCE`, `API_URL`, `ENABLE_MOCK_API`, `LOG_LEVEL`) are read only under `src/server/` (and in `instrumentation.ts`). A new variable goes into the schema and into `.env.example`.

## Done means

- Static checks: `pnpm test` and `pnpm turbo run lint typecheck build --filter=@frontend/client` pass.
- E2E: `pnpm test:e2e` passes, covering `/` and `/vi` where copy is involved.
- Runtime: `next-dev-loop` (`/_next/mcp` `get_errors` / `get_compilation_issues`, plus a browser check of the changed route in both locales and both themes). If the tooling isn't available, report that it was skipped.
