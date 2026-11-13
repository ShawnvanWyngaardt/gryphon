# James the Gryphon: DESIGN.md drift checker

Built by Claude Code. Directed and reviewed by Shawn (product owner and reviewer).

## What we are building

A tool that checks whether UI code follows a project's DESIGN.md. It finds hard-coded colours, fonts, spacing and radius values that are not in the design tokens, and flags generic AI UI tropes. Delivered as a CLI, a GitHub Action and a browser playground. Full requirements live in `docs/SPEC.md` once Gate 1 is approved.

## Roles

- You are the engineer. Shawn is the product owner and reviewer.
- Shawn must be able to explain every decision in a job interview. In every PR description, explain what you did and why in plain language, including trade-offs you rejected.
- If you are unsure, ask in the PR. Do not guess on scope, direction or anything that is hard to undo.

## Gates: stop and wait for Shawn's approval

1. **Spec:** `docs/SPEC.md`, `DESIGN.md`, `docs/BACKLOG.md`
2. **Architecture:** stack and structure as a decision record in `docs/adr/`
3. **First working slice:** DESIGN.md parser plus CLI, running on real code
4. **Release candidate:** security review, accessibility review, design critique done; deploy ready
5. **Launch:** public URL, npm package, feedback from real users, case study draft

At each gate: open a PR, summarise in plain language, list the decisions you need, then stop.

## Between gates

- One ticket per PR. Aim for under 300 changed lines.
- Label a PR `minor` only for fixes, copy, tests or small additions inside already-approved scope.
- Until Shawn confirms otherwise in writing, nothing merges without his review, `minor` included.
- Anything that changes scope, direction, dependencies, the public API or a major version is never `minor`.

## Engineering rules

- TypeScript in strict mode. Vue 3 and Vite for the playground.
- Tests first for the parser and the scanner. Target at least 80% coverage on both.
- ESLint and Prettier on every PR via GitHub Actions.
- No telemetry. No user code ever leaves the user's machine or browser.
- Every new dependency is justified in its PR. Prefer none.
- Architectural decisions go in `docs/adr/NNNN-short-title.md`.
- The checker runs on this repo's own code once it exists.

## Cost and tooling limits

- Free tiers only. If anything needs payment, stop and ask.
- Do not install skills, plugins or MCP servers without approval in a PR. Keep the context lean.
- Shawn is on Claude Pro with limited usage. Work in short sessions. End every session by updating `docs/STATUS.md` with: done, next, blocked.

## Writing rules

- English.
- No em dashes anywhere: in code comments, docs, PR text or UI copy.
- Short sentences, plain words.
