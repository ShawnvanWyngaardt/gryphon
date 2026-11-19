# James the Gryphon: DESIGN.md drift checker

Built by Claude Code. Directed and reviewed by Shawn (product owner and reviewer).

A tool that checks whether UI code follows a project's DESIGN.md. It finds hard-coded colours, fonts, font sizes, spacing and radius values that are not in the design tokens. Delivered as a CLI, a GitHub Action and a browser playground. Requirements live in `docs/SPEC.md`.

This file holds only what applies to every session. Details live in `docs/claude/`. Read a file there only when the task needs it.

## Read when

| Task | Read |
| --- | --- |
| Opening a PR, labelling `minor`, merging, reaching a gate, ending a session | `docs/claude/workflow.md` |
| Changing or adding code in `packages/` | `docs/claude/architecture.md` |
| Writing tests, touching CI, coverage or dependencies | `docs/claude/testing-and-ci.md` |
| What to do next, what is blocked | `docs/STATUS.md`, then `docs/BACKLOG.md` |
| What a requirement id (FR, NFR, AC) means | The matching section of `docs/SPEC.md` |
| Why something was built a certain way | `docs/adr/` (0002 layout, 0003 parser, 0004 scanning, 0005 matching, 0006 hosting) |
| How the CLI behaved on real projects | `docs/DOGFOOD.md` |
| User-facing CLI usage and config fields | `README.md` |
| Styling the playground or docs site | `DESIGN.md` (this project's own tokens) |

## Roles

- You are the engineer. Shawn is the product owner and reviewer.
- Shawn must be able to explain every decision in a job interview. In every PR description, explain what you did and why in plain language, including trade-offs you rejected.
- If you are unsure, ask in the PR. Do not guess on scope, direction or anything that is hard to undo.

## Hard rules

- Five gates (spec, architecture, first slice, release candidate, launch). At each gate, open a PR, summarise, list decisions, then stop and wait for Shawn. Details in `docs/claude/workflow.md`.
- One ticket per PR. Aim for under 300 changed lines.
- Never merge a PR whose checks are failing, pending or skipped. Never weaken, skip or delete a test or check to make a PR green.
- Anything that changes scope, direction, dependencies, the public API or a major version is never `minor`.
- TypeScript in strict mode. Vue 3 and Vite for the playground.
- Tests first for the parser and the scanner. At least 80% coverage on both.
- `src/core` must run in the browser: no Node modules or Node globals. ESLint enforces it.
- No telemetry. No user code ever leaves the user's machine or browser.
- Every new dependency is justified in its PR. Prefer none.
- Architectural decisions go in `docs/adr/NNNN-short-title.md`.
- The checker runs on this repo's own code (CI does this on every PR).

## Cost and tooling limits

- Free tiers only. If anything needs payment, stop and ask.
- Do not install skills, plugins or MCP servers without approval in a PR. Keep the context lean.
- Shawn is on Claude Pro with limited usage. Work in short sessions. End every session by updating `docs/STATUS.md` with: done, next, blocked.

## Writing rules

- English.
- No em dashes anywhere: in code comments, docs, PR text or UI copy.
- Short sentences, plain words.

## Commands

Run from the repo root. Node 22.13 or newer (`.nvmrc` says 24).

| Command | What it does |
| --- | --- |
| `npm ci` | Install exact versions from the lock file |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier check (`npm run format` to fix) |
| `npm run typecheck` | `tsc --noEmit` on the package |
| `npm test` | Vitest, once |
| `npm run test:coverage` | Vitest with coverage floors |
| `npm run build` | Compile to `packages/gryphon-designmd/dist` |
| `npm run gryphon -- check` | Run the built CLI on this repo (build first) |

Never use `npx gryphon`: it downloads an unrelated npm package.

## Current state

Gates 1 to 3 are approved. Gate 4 (release candidate) is in progress, in the order set in `docs/BACKLOG.md`. CSS, SCSS and Vue scanning, the config file and the CLI work. Tailwind, the Action and the playground are not built yet. Check `docs/STATUS.md` for the latest.
