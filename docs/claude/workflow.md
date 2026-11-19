# Workflow: gates, PRs and sessions

Read this before opening a PR, labelling one `minor`, merging, or ending a session.

## Gates: stop and wait for Shawn's approval

1. **Spec:** `docs/SPEC.md`, `DESIGN.md`, `docs/BACKLOG.md` (approved, PR 1)
2. **Architecture:** stack and structure as decision records in `docs/adr/` (approved, PR 2)
3. **First working slice:** DESIGN.md parser plus CLI, running on real code (approved, PR 15)
4. **Release candidate:** security review, accessibility review, design critique done; deploy ready
5. **Launch:** public URL, npm package, feedback from real users, case study draft

At each gate: open a PR, summarise in plain language, list the decisions you need, then stop. Do not start the next gate's work.

## Between gates

- One ticket per PR. Aim for under 300 changed lines. Ticket ids (G4-05 and so on) and their order are in `docs/BACKLOG.md`.
- Size bands count code only: S under 100 lines, M 100 to 300, L over 300. Tests roughly double the total (rule approved in PR 14).
- Label a PR `minor` only for fixes, copy, tests or small additions inside already-approved scope.
- A `minor` PR may be merged without Shawn's review once CI is green. CI exists and its checks are required on `main`, so this rule is active.
- Never merge a PR whose checks are failing, pending or skipped. Never weaken, skip or delete a test or check to make a PR green.
- Anything that changes scope, direction, dependencies, the public API or a major version is never `minor`. The CLI options, exit codes, config file and JSON report are public API.
- List every `minor` PR merged without review in the "Minor PRs merged without review" table in `docs/STATUS.md`, so Shawn can skim them weekly.

## Branches and commits

- Branch names: `claude/<ticket-id>-<short-name>`, for example `claude/g4-03-ignore-comments`.
- Commit subject starts with the ticket id when there is one: `G4-03: ignore comments and suppression counts`.

## PR description

Shawn must be able to explain every decision in a job interview. Each PR description has, in plain language:

1. **What:** the change, and the ticket and requirement ids it covers (FR, NFR, AC from `docs/SPEC.md`).
2. **Why:** the reason for the approach.
3. **Trade-offs rejected:** the other options and why not.
4. **New dependencies:** each one justified, or "none".
5. **Decisions for Shawn:** anything you are unsure about. Ask; do not guess on scope, direction or anything hard to undo.
6. **Size:** changed lines, and how many are tests.

## Ending a session

Update `docs/STATUS.md` with:

- **Done:** what merged or is in review, with PR numbers.
- **Next:** the next ticket, and anything waiting on Shawn.
- **Blocked:** what is blocked and on whom, or "None".

Also update the "Last updated" date and, when a ticket closes, its row in the size table.
