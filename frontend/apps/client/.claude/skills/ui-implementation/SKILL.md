---
name: ui-implementation
description: Implement visible UI in apps/client from a screenshot/PNG or spec using the shared Tailwind v4 tokens and @frontend/ui — decomposition, token mapping, component placement, states, responsiveness, accessibility and visual verification. Use for any task that builds or changes UI.
---

# UI implementation (apps/client)

## Steps

1. **Reference.** Open the screenshot(s) cited in the task or requirement with Read. Spec references live in `../../../docs/ui-reference/`.
2. **Decompose.** Break the screen into regions, then components. Put app components in `src/components/<feature>/`.
   - Reuse `@frontend/ui` (`Button`, `Card`, `cn`) before writing anything new.
   - A new shared component is a separate `@frontend/ui` task. It lives in `../../packages/ui/src/components/<name>/` with `<name>.tsx`, `<name>.stories.tsx` and `index.ts`, and is re-exported from `src/index.ts`. Its story file must cover its variants and states. Check it in `pnpm storybook` at http://localhost:6006, where the a11y panel must be clean.
3. **Tokens.** Every colour, radius and font comes from `../../packages/tailwind-config/theme.css` (`bg-canvas bg-surface-muted text-muted-foreground bg-accent rounded-card …`). Tailwind's default palette is disabled. In JS, use `colorVar('chart-pos')` from `@frontend/ui`.
   - Build from the existing `@frontend/ui` components first (`Card*`, `StatCard`, `Checkbox` + `Swatch`, `ToggleButton`, `Legend*`, `IconBadge` + `Tooltip`, `Skeleton`), plus icons from `@frontend/ui`..
   - No arbitrary colour values like `bg-[#...]`.
   - A missing token is a separate `@frontend/tailwind-config` task.
4. **i18n & theme.**
   - No hard-coded copy: add the keys to `src/i18n/messages/{en,vi}.json`.
   - Check the UI in light and dark (Storybook has a theme toolbar) and in both locales; Vietnamese strings are longer, so let layouts wrap.
5. **States.** Implement default/hover/active/disabled/focus, plus loading, empty and error for anything that shows data.
6. **Responsive.** Build mobile-first and check at 375px and 1280px. Never allow horizontal page scroll.
7. **Accessibility.**
   - Use semantic elements, with a `label` for every input.
   - Toggles use `aria-pressed`, or are real checkboxes.
   - Keep focus visible.
   - Icon-only buttons need an `aria-label`.
8. **Component API.** Accept `className` and merge it with `cn()`. Spread native props.

## Verify

- Run the task's `pnpm turbo …` command, and `pnpm test:e2e` when the task touches a user flow.
- Run `pnpm dev`, open `http://localhost:3000`, and compare with the reference. In the task report, list any visual differences that remain.
