---
name: requirement-analysis
description: Turn a feature request, spec excerpt or UI screenshot/PNG for apps/admin into a testable requirement document (.ai-workflow/features/<slug>/requirement.md). Use for workflow phase "analyze" or whenever a request must be clarified before planning.
---

# Requirement analysis (apps/admin)

Output: `.ai-workflow/features/<slug>/requirement.md`, built from `.ai-workflow/templates/requirement.md`. The slug is short kebab-case.

## Inputs to read

1. The user's request and any files or images they pass.
2. Project spec: `../../../docs/US-TASK-DETAIL.md`. This app's stories are listed in `CLAUDE.md`. Use the spec's design tokens (§0.3) and API contract (§1.2).
3. Existing code in `src/`, so the requirement can say what already exists.

## Screenshot / PNG analysis (only when images are supplied)

Open each image with Read. Record:

- **Layout.** Regions from top to bottom and left to right, how the layout behaves at mobile width, and approximate spacing and radius.
- **Components.** Each one gets a name and its states (default/hover/active/disabled/loading/empty/error). Note whether `@frontend/ui` already has it (`../../packages/ui/src/index.ts`).
- **Visual tokens.** Map each colour to a token in `../../packages/tailwind-config/theme.css`. List any colour with no match as a **new token needed**, which is a shared-package change.
- **Text and data.** Separate static copy from data-driven values, and name the API field that feeds each data-driven value.
- **Interactions.** Toggles, hover/tooltip, animation, export, navigation.
- **Uncertain.** Anything the image can't answer, written as an Open question.

## Rules

- Write acceptance criteria as observable, testable checklist items (AC-1, AC-2, …).
- Write down what is out of scope. Anything that belongs to `apps/client` is out of scope.
- Don't design tasks and don't write code.
- Leave `Status: Draft`.
