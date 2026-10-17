---
description: apps/client AI workflow — analyze → plan → implement → review → commit, with user approval gates
argument-hint: analyze <request|files> | approve <slug> requirement|plan | plan <slug> | implement <slug> <T-xx> | review <slug> <T-xx> | commit <slug> <T-xx> | status [slug]
---

Run the AI workflow for **apps/client**, as described in `CLAUDE.md` ("AI workflow"). State lives in `.ai-workflow/features/<slug>/`.

Arguments: `$ARGUMENTS`

Handle the first word of the arguments as the phase:

- **analyze `<request / file paths / screenshot paths>`**
  1. Pick a kebab-case slug.
  2. Create `.ai-workflow/features/<slug>/progress.md` from the template.
  3. Delegate to the `analyst` subagent, passing it the request and every image path.
  4. Show the summary and open questions.
  5. Ask the user to answer them, or to run `/workflow approve <slug> requirement`.
  6. **Stop.**

- **approve `<slug>` requirement|plan**
  Only when the user typed this, or explicitly approved in words:
  - set `Status: Approved` and `Approved by / date: user, <today>` in `requirement.md` or `tasks.md`;
  - update `progress.md`.

  Never approve on the user's behalf.

- **plan `<slug>`**
  1. Require that `requirement.md` is Approved.
  2. Delegate to the `planner` subagent.
  3. Show the task table and the shared-package impact.
  4. Ask for `/workflow approve <slug> plan`.
  5. **Stop.**

- **implement `<slug>` `<T-xx>`** (one task at a time)
  1. Require that `tasks.md` is Approved and that the task's dependencies are done.
  2. If the _Pre-existing_ section of `progress.md` is empty, record `git status --short` there.
  3. Delegate to the `developer` subagent.
  4. Set the task to `review`.
  5. Continue straight into **review**.

- **review `<slug>` `<T-xx>`**
  1. Delegate to the `reviewer` subagent.
  2. On CHANGES_REQUESTED: show the findings and offer to send them back to the `developer` (at most 2 rounds; after that, ask the user).
  3. On PASS: show the proposed commit and the file list.

- **commit `<slug>` `<T-xx>`**
  1. Follow "Git safety & commits" in `../../CLAUDE.md`. Show the paths to stage and the message, then wait for an explicit yes.
  2. Stage those paths only, by name.
  3. Commit, then mark the task `done` with the commit hash.
  4. Never push.

- **status `[slug]`**
  Read `progress.md` (or, with no slug, every feature folder) and report phases, approvals and the next command to run.

If the phase is missing or unknown, show the usage and run `status`.
