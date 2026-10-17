# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Context

Frontend monorepo for a take-home test (`../yeu-cau.md`): a "Revenue Trend" dashboard cloned from a video, plus an admin UI that edits the data behind it. The full spec (UI analysis, design tokens, API contract, user stories) is in `../docs/US-TASK-DETAIL.md`, with reference screenshots in `../docs/ui-reference/`. Read it before building features. The backend is a separate project in `../backend` (same git repo, independent package and CI). Each app reads data on the server through a data access layer (`src/server/`). There, `DATA_SOURCE=mock|api` picks either in-app mock fixtures or the backend at the server-only `API_URL`. The mock JSON Route Handlers (`src/app/api`) answer only when `ENABLE_MOCK_API=true`. See each app's `CLAUDE.md`.

- `apps/client` (port 3000): public dashboard view.
- `apps/admin` (port 3001): admin login + CRUD for weekly metrics and event impacts. The spec suggests putting admin under `/admin` in a single app; here it is a separate app instead, with its own session cookie. The browser never calls the backend, so the backend's CORS (`WEB_ORIGINS`) only matters for tools such as Swagger.

## Commands

Use Node 24 (`.nvmrc`; `engines` requires ≥22.12). pnpm 10 is pinned via `packageManager`. Run `corepack enable` first; if `pnpm` is not on PATH, use `corepack pnpm …`.

```bash
pnpm install
pnpm dev                 # both apps (turbo); dev:client / dev:admin for one
pnpm build | lint | typecheck | format | format:check
pnpm check               # everything CI's first job runs: format:check + lint + typecheck + build + build-storybook
pnpm --filter @frontend/admin <script>        # run a script in one package
pnpm --filter @frontend/client add <dep>      # add a dep to one package
pnpm test                # Vitest (ui, api-client, i18n, both apps); one file: pnpm --filter @frontend/ui test -- src/lib/format.test.ts
pnpm test:e2e            # Playwright E2E for both apps (starts/reuses dev servers)
pnpm --filter @frontend/client test:e2e -- e2e/smoke.spec.ts -g "renders"   # one file / one test
pnpm storybook           # Storybook for @frontend/ui on :6006; build-storybook for static output
```

- **Env.** Each app needs a `.env` (copy it from `.env.example`).
  - `src/env.ts` uses `@t3-oss/env-nextjs` + zod. `next.config.ts` imports it, so an invalid value fails `next dev`/`next build`.
  - Read env only through `import { env } from '@/env'`, never `process.env`.
  - Server-only vars (`API_URL`, `AUTH_SECRET`) throw if read in the browser. Public vars need `NEXT_PUBLIC_` and an entry in `experimental__runtimeEnv`.
  - Add a new var to the schema, `.env.example`, and turbo `build.env` if it affects the build. Set `SKIP_ENV_VALIDATION=true` only for secret-less image builds.
- **Versions.** Shared dependency versions live in the `catalog:` block of `pnpm-workspace.yaml`, and every `package.json` references them as `"catalog:"`. Bump a version there, not in a `package.json`. Add a new shared dependency to the catalog first.
- **CI.** `../.github/workflows/frontend.yml` (repo root, runs in `frontend/` when it changes) has two jobs: `check`, and then `e2e`, which runs `pnpm build`, then `CI=1` Playwright in evidence mode, then always uploads the report.
- An app's `typecheck` runs `next typegen` before `tsc`, because route types are generated.
- **Playwright** runs once per app. Specs live in `apps/<app>/e2e/*.spec.ts`, and `apps/<app>/playwright.config.ts` calls `createAppE2EConfig({ port })` from `@frontend/playwright-config`. Locally it reuses a running `pnpm dev` or starts one. With `CI=1` it runs `pnpm start`, so run `pnpm build` first. On a new machine, run `pnpm --filter @frontend/client exec playwright install chromium` once to download the browser. Evidence: the HTML report always holds a screenshot, video and trace of failed tests; `pnpm test:e2e:evidence` (`E2E_EVIDENCE=1`) keeps them for every test, and CI uploads the report + `test-results/junit.xml` on every run. Responsive: each app's `e2e/responsive.spec.ts` loops over `VIEWPORTS` (320 → 1920) from `@frontend/playwright-config` with `expectNoHorizontalScroll`, `expectControlsWithinViewport` and `captureEvidence`; a new page belongs in it. Unit tests are Vitest, as `*.test.ts(x)` next to the code. `packages/ui` uses Testing Library + jsdom. The apps alias `server-only` to an empty module.
- **Storybook** (`@storybook/react-vite`) lives in `packages/ui`. Each component has its own folder, `src/components/<name>/` (`<name>.tsx`, `<name>.stories.tsx`, `index.ts`), and is re-exported from `src/index.ts`. `.storybook/preview.css` imports the same `base.css` as the apps and scans `../src`, stories included. The a11y addon fails a story on violations (`a11y.test: 'error'`).
- Run Prettier from the repo root so `.prettierignore` applies.

## Architecture

- **Internal packages ship raw TypeScript, with no build step.** Their `exports` point at `src/*.ts(x)`. Only the package root (plus `styles.css` for `ui`) is exported; there are no deep imports.
- **`@frontend/next-config`** is plain JS, because `next.config.ts` loads it at build time. Its `createNextConfig(overrides?)` sets `transpilePackages` (`WORKSPACE_PACKAGES`), the security headers, `poweredByHeader: false` and `typedRoutes`. Each app's `next.config.ts` is one call to it. A new runtime TS package must be added to `WORKSPACE_PACKAGES`.
- **Design tokens (Tailwind v4, CSS-first, no `tailwind.config.js`)** live in `packages/tailwind-config/theme.css`, in three layers:
  1. **Primitives:** `--palette-*` on `:root`, raw values from `docs/ui-reference`. Never use them in markup.
  2. **Semantic:** `@theme static`, which generates the utilities. Examples: `bg-canvas`, `bg-surface`, `bg-surface-muted`, `border-border`, `text-foreground`, `text-muted-foreground`, `bg-primary text-primary-foreground`, `bg-accent hover:bg-accent-hover`, `text-positive bg-positive-soft`, `text-negative`, the `chart-*` series colours, `rounded-card` / `rounded-tile` / `rounded-control`, `shadow-card`, `ease-emphasized`, `animate-fade-in`.
  3. **Component:** variants inside `@frontend/ui`, built only from semantic tokens.

  Tailwind's default palette is disabled (`--color-*: initial`), so `text-gray-500` and the like don't exist. To theme the app (for example dark mode), override the semantic `--color-*` vars under a selector.

  For JS values (chart/SVG props, inline styles), use `colorVar('chart-pos')` from `@frontend/ui`. Its typed `COLOR_TOKENS` list must match `theme.css`; `tokens.test.ts` enforces this.
  - `@frontend/tailwind-config/base.css` contains Tailwind, the theme and the `body` defaults.
  - `@frontend/ui/styles.css` holds the `@source` for ui's components; stories are excluded.
  - An app's `globals.css` is just these two imports. A new package with class names ships its own `styles.css`, and each app imports it.
  - Add new colors to `theme.css`; don't hard-code hex values.
  - Prettier sorts classes using `base.css` (`tailwindStylesheet`) and inside `cn()` calls.

- **`@frontend/ui`** is the design system. Import everything from the package root.
  - **Folders:** `components/<name>/` (`<name>.tsx`, `.stories.tsx`, `.test.tsx` when it has logic, `index.ts`), `hooks/`, `lib/` (`cn`, `format`), `theme/` (`colorVar`, `ColorToken`), `icons/`.
  - **Icons:** a curated re-export of lucide (`ChartColumnIcon`, `DownloadIcon`, …). Apps import icons from here, not from `lucide-react`.
  - **Components:**
    - `Button`, with variants `primary` / `accent` / `outline` / `ghost`, sizes `sm` / `md` / `icon`, and `loading`. `buttonClasses()` gives you the same styling for links.
    - `ToggleButton`
    - `Card`, `CardHeader`, `CardTitle`, `CardActions`, `CardContent`
    - `Checkbox`
    - `Swatch`
    - `Legend`, `LegendItem`, `LegendSeparator`
    - `StatCard`
    - `Delta`
    - `IconBadge`
    - `Tooltip`
    - `Skeleton`
  - **Patterns:**
    - Compound components with named exports. Don't use `Card.Header` dot notation; it breaks across the RSC boundary.
    - Every component accepts `className` (merged with `cn`) and spreads native props.
    - Variants are `const` maps of classes, with types derived from the keys.
    - Stateful components are controlled or uncontrolled through `useControllableState`.
    - Behaviour lives in headless hooks (`useTooltip`, `useSelectionSet` with `min`) that components build on.
    - Only files that use hooks start with `'use client'`.
  - **Formatting:** values are formatted by the caller with `formatCurrency` / `formatNumber` / `formatThousands` / `formatPercentChange` (cached `Intl`). Components take the formatted `ReactNode`.
  - `ReferenceComposition` in the Card stories shows how the pieces rebuild the reference screen.
- **`@frontend/api-client`** has three parts:
  - `client.ts`: `createHttpClient({ baseUrl, timeoutMs?, retry?, interceptors?, fetch? })`, which returns `get`/`post`/`put`/`delete`. It handles JSON, `query` params (`undefined`/`null` are dropped), a default 15s timeout and caller abort signals. Interceptors run on request, response and error. GET/HEAD are retried on network errors and 5xx.
  - `interceptors.ts`: `requestIdInterceptor`, `headersInterceptor`.
  - `errors.ts`: `ApiError` with `status`, `code`, `details`, `requestId`, `retryAfterSeconds`, built from the backend error body `{ statusCode, code, error, details?, requestId, path, timestamp }`. `status` is `0` (code `NETWORK_ERROR`/`TIMEOUT`) when no response arrived. Narrow with `isApiError()` and branch on `code`, never on the message.
  - `types/`: `dashboard.ts` and `admin.ts` mirror spec §1.2; `errors.ts` mirrors `../backend/src/common/exceptions/error-codes.ts` (`ErrorCode`, `ApiErrorBody`). Update them in the same change as the backend contract.

  Clients are created only on the server, in each app's `src/server/**/sources/api`. The browser never calls the backend directly. Admin forwards its session as `Authorization: Bearer` and the user's `X-Forwarded-For` (the backend's login lockout is per IP), and maps backend errors to the domain errors in `src/server/errors.ts`, the same ones the mock raises.
  - The mock Route Handlers (`src/app/api`, `ENABLE_MOCK_API=true`) follow the backend contract exactly: bare resources, `X-Total-Count` on lists, `201` + `Location`, `204`, UUID ids, and the same error body and codes. The Playwright API specs assert it, so they pass against both sources (`DATA_SOURCE=api API_URL=… pnpm test:e2e`, see README).

- **Shared config packages**:
  - `@frontend/typescript-config`: `base` / `nextjs` / `react-library`.
  - `@frontend/eslint-config`: `defineConfig` flat configs `base` / `next` / `react-library`. Ignores and common rules (`eqeqeq`, `no-console` except warn/error, inline type imports) live in `shared.js`. `react-library` adds the Storybook rules.
  - `@frontend/playwright-config`.
  - `@frontend/next-config`. Apps use the `@/*` → `src/*` path alias.

## Package impact rules

Each consumer is listed with how it uses the package.

| Changed package               | Consumers                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `@frontend/ui`                | `client`, `admin` (runtime via `transpilePackages`; `styles.css` imported in `globals.css`); run its `test` too  |
| `@frontend/api-client`        | `client`, `admin` (runtime, `transpilePackages`)                                                                 |
| `@frontend/tailwind-config`   | `client`, `admin` (`base.css` + `postcss.config.mjs`), `ui` Storybook + `tokens.test.ts`, Prettier class sorting |
| `@frontend/eslint-config`     | every package's `lint` (`next` → apps, `react-library` → `ui`, `base` → `api-client`)                            |
| `@frontend/typescript-config` | every package's `typecheck`/`build` (`nextjs` → apps, `react-library` → `ui`, `base` → `api-client`)             |
| `@frontend/playwright-config` | `client`, `admin` `test:e2e`                                                                                     |
| `@frontend/i18n`              | `client`, `admin` (`commonMessages`, `mergeMessages` in `src/i18n/request.ts`; catalog tests)                    |
| `@frontend/next-config`       | `client`, `admin` `next.config.ts` (`build`, `dev`, headers)                                                     |

- After changing a shared package, run `pnpm turbo run lint typecheck build --filter=...@frontend/<pkg>`. For `ui` or `tailwind-config`, also run `pnpm test` and `pnpm build-storybook`. For `playwright-config`, also run `pnpm test:e2e`. The leading `...` includes every dependent.
- An app-only change needs `--filter=@frontend/<app>` only.
- A change to root config (`turbo.json`, `pnpm-workspace.yaml`, root `package.json`, `.prettierrc.json`, `.github/`) needs `pnpm check`.
- Changing an exported API in `ui` or `api-client` means updating every call site in the same task, or planning a follow-up task for each consumer.

## AI workflow

The monorepo root has no AI workflow. Each app has its own: `apps/<app>/CLAUDE.md`, `apps/<app>/.claude/` (agents `analyst`, `planner`, `developer`, `reviewer`, their skills, and `/workflow`), and `apps/<app>/.ai-workflow/`. To use it, run Claude Code from `apps/client` or `apps/admin`; this file still loads there as the parent context.

Each app also has the official Next.js agent tooling:

- `CLAUDE.md` imports the `AGENTS.md` that `next dev` manages, which points to the bundled docs in `node_modules/next/dist/docs/`.
- `.mcp.json` registers `next-devtools-mcp`.
- The vendored `next-dev-loop` and `next-bundle-optimizer` skills are synced and pinned by `pnpm skills:sync` (`scripts/sync-next-skills.mjs`). Don't edit them by hand.

Root `.claude/` holds only generic, third-party agents and skills (`code-reviewer`, `frontend-developer`, `react-best-practices`, `ui-ux-pro-max`, …) and the Git safety permissions.

## Git safety & commits

These rules apply to all work in the repo, whether it's done in the root or in an app.

- **Check first.** Run `git status --short` before you change anything. Files that were already modified or staged belong to the user; never stage, revert or stash them.
- **Stage by name.** Stage only the files you changed, with `git add <path> …`. Never use `git add -A`, `git add .` or `git commit -a`. Never use `reset --hard`, `clean`, `restore`, `stash` or `--no-verify`. The `.claude/settings.json` files deny these.
- **Commit only on request.** Commit only when the user asks or confirms the file list and message (in an app workflow, that comes after the reviewer returns PASS). Never push unless asked.
- **Message format.** Use Conventional Commits: `type(scope): summary`.
  - Keep the summary imperative, lowercase and under 72 characters.
  - Put a body when it adds information, plus a `Refs: <slug> T-xx` footer.
  - `type` is one of: `feat`, `fix`, `refactor`, `style`, `perf`, `test`, `docs`, `build`, `chore`, `ci`.
  - `scope` is one of: `client`, `admin`, `ui`, `api-client`, `tailwind-config`, `eslint-config`, `typescript-config`, `repo` (root config). Workflow files inside an app use that app's scope, e.g. `chore(client): …`.
- **One task, one commit.** One commit covers one task and one scope. If a task really spans two packages, use the main scope and list the others in the body.

## Version constraints

- TypeScript is pinned to `~6.0` because `typescript-eslint` doesn't support TS 7.
- ESLint is pinned to `^9` because the plugins inside `eslint-config-next` (`react`, `import`, `jsx-a11y`) don't support ESLint 10.
- Don't bump either until upstream support lands.
- Native build scripts are allowlisted in `pnpm-workspace.yaml` (`onlyBuiltDependencies`).
