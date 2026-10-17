---
name: nextjs-frontend
description: Conventions for Next.js 16 (App Router) + React 19 code in apps/admin — server-only DAL with mock/api repositories, Server Actions with useActionState, RBAC (ADMIN/VIEWER) enforced in proxy/DAL/UI, next-intl ([locale]) with message-key validation, next-themes, env and observability. Use whenever implementing or reviewing code in this app.
---

# Next.js conventions (apps/admin)

Next 16 changed several APIs. For anything not covered here, read the bundled docs in `node_modules/next/dist/docs/` (see `AGENTS.md`, which `next dev` writes) rather than relying on memory.

## Structure

- `src/app/[locale]/…` is routing only, with the route groups `(auth)` and `(dashboard)`.
- Domain code lives in `src/features/<domain>/{actions.ts,schemas.ts,components,lib}`. App-wide UI goes in `src/components/`, pure helpers in `src/lib/`, and the data access layer in `src/server/` (`import 'server-only'`).
- ESLint blocks `@/server/*` and `@/app/*` imports from components and lib. Server Actions (`features/*/actions.ts`) may import `@/server/*`.

## Reading data

- Pages are Server Components. They call `requirePermission('<x>:read')`, then DAL functions (`listWeekMetrics`, `listWeekEvents`, `getCurrentUser`). **Never** fetch this app's own Route Handlers from the server.
- A new data need means a DAL function plus a repository method, implemented in **both** `sources/mock` and `sources/api`.

## Mutations

- Every write is a Server Action in `features/<domain>/actions.ts`, following this sequence:
  1. `authorize(permission)`, which returns a denied `ActionState` instead of throwing;
  2. zod `safeParse` on the server, with `fieldErrorsOf` producing dotted keys;
  3. the DAL call, mapping `NotFoundError` / `ConflictError` to messages;
  4. `logger` with the action, user and outcome;
  5. `revalidatePath`;
  6. return an `ActionState` whose message is an **i18n key**.
- Forms use `useActionState`. Handle the result in a small client wrapper around the action (toast, close a dialog), not in an effect: `react-hooks/set-state-in-effect` forbids that.
- React resets forms after an action, so return the non-secret `values` and use them as `defaultValue`.
- Keep login-style forms as plain `<form action={serverAction}>` so they work without JavaScript.

## Auth & RBAC

- Permissions live in `lib/permissions.ts` (`can`, `ROUTE_PERMISSIONS`). A new protected route or action means a permission entry, plus a guard on the page, action and handler, plus hidden UI.
- `proxy.ts` checks only the cookie (it decodes the role, never queries the DB). Real enforcement happens in the DAL.

## i18n & theme

- Copy goes in `src/i18n/messages/{en,vi}.json`; the completeness test enforces every key in both. Validation messages are keys under `validation.*`.
- Navigation and redirects use `@/i18n/navigation` (`Link`, `useRouter`, `redirect({ href, locale })`).
- Format dates with `lib/week.ts` (locale-aware, UTC), and money and numbers with the `@frontend/ui` formatters plus `useLocale()`.
- Theme: semantic tokens only.

## Env

- Read env only through `import { env } from '@/env'`; server variables only under `src/server/` and in actions. A new variable goes into the schema and `.env.example`.

## Done means

- Static checks: `pnpm test` and `pnpm turbo run lint typecheck build --filter=@frontend/admin` pass.
- E2E: `pnpm test:e2e` passes; it resets the mock data first.
- Runtime: `next-dev-loop` checks the changed route in both locales, both themes and both roles. If the tooling isn't available, report that it was skipped.
