# Backlog

Tickets in build order. One ticket per PR, aiming for under 300 changed lines.

Sizes: **S** is under 100 lines and fits in one short session. **M** is 100 to 300 lines, about two short sessions. **L** is close to the 300-line limit or has unknowns, about three short sessions; split it if it grows.

Requirement ids (FR, NFR, AC) refer to `docs/SPEC.md`.

## Summary

Counted by script from the tables below, not by hand.

| Gate | Tickets | S | M | L | Short sessions (estimate) |
| --- | --- | --- | --- | --- | --- |
| 1 Spec | 1 | 0 | 1 | 0 | 2 |
| 2 Architecture | 5 | 4 | 1 | 0 | 6 |
| 3 First working slice | 11 | 6 | 4 | 1 | 17 |
| 4 Release candidate | 19 | 8 | 9 | 2 | 32 |
| 5 Launch | 6 | 4 | 2 | 0 | 8 |
| **Total** | **42** | **22** | **17** | **3** | **65** |

Session estimate: S = 1, M = 2, L = 3. These are guesses for planning, not commitments.

**Re-estimate after the Gate 1 scope cut.** The first draft had 44 tickets (the PR description wrongly said 50) and about 71 short sessions. This version has 42 tickets and about 65 sessions: about 8% less work.

- Removed: JSX and TSX scanner (M), `--changed-since` (M), AI trope rules (M). Minus 6 sessions.
- Shrunk: playground editor and report from L to M (plain text areas, no click-to-line). Minus 1 session. URL sharing was dropped from the offline test ticket, which stays S.
- Docs stay M, but README only, with three examples instead of four.
- Added: a CI test comparing our parser with Google's (S), as recommended in SPEC section 9, decision A. Plus 1 session.
- **The saving is small.** The hard parts of v1 (parser, CSS and Vue scanning, Tailwind resolution, the Action, release and review work) all stay. The cut mainly lowers risk and keeps v1 focused. It does not make v1 much shorter.

## Gate 1: Spec

| Id | Ticket | Size | Covers |
| --- | --- | --- | --- |
| G1-01 | Spec, DESIGN.md, backlog, ADR 0001, status, README, and review fixes (this PR) | M | All |

## Gate 2: Architecture

| Id | Ticket | Size | Covers |
| --- | --- | --- | --- |
| G2-01 | ADR 0002: repo layout (one package or workspaces for core, CLI, Action, playground) and toolchain (Node, package manager, test runner) | S | NFR-D |
| G2-02 | ADR 0003: DESIGN.md parser (own parser, Google's package as dev dependency for comparison) | S | FR1 |
| G2-03 | ADR 0004: how we scan each file type (CSS, SCSS, Vue SFC, Tailwind classes; how line and column are tracked) | M | FR2, NFR-P |
| G2-04 | ADR 0005: colour distance (CIEDE2000 or OKLab) and nearest-token logic | S | FR3 |
| G2-05 | ADR 0006: hosting (GitHub Pages), CSP, npm name and release pipeline (provenance, Action versioning) | S | FR6, FR7, NFR-S, NFR-C |

## Gate 3: First working slice

| Id | Ticket | Size | Covers |
| --- | --- | --- | --- |
| G3-01 | Scaffold: TypeScript strict, ESLint, Prettier, test runner, coverage thresholds | S | NFR-D1 to D3 |
| G3-02 | CI workflow: lint, type check, tests, coverage on every PR. After this merges, `minor` PRs may merge on green. | S | NFR-D2 |
| G3-03 | Core types: token set, finding, report, JSON schema v1 | S | FR3, AC5.5 |
| G3-04 | Parser part 1: front matter, token groups, unknown content, errors (tests first) | M | AC1.1, 1.3, 1.4, 1.8 |
| G3-05 | Parser part 2: reference resolution and loops (tests first) | S | AC1.2 |
| G3-06 | Parser comparison test against `@google/design.md` in CI | S | FR1, Risk "spec changes" |
| G3-07 | Value normalisers: colour parsing to one space, rem and em to px (tests first) | M | AC1.5, 1.6 |
| G3-08 | Nearest-token matcher and `off-token` versus `raw-token-value` (tests first) | M | AC3.1, 3.2 |
| G3-09 | CSS and SCSS scanner with allow-list (tests first) | L | FR2, AC2.2 to 2.4 |
| G3-10 | CLI v0: `check`, text output, exit codes, file discovery and ignores | M | AC5.1 to 5.4, AC2.9 |
| G3-11 | Dogfood: run on this repo and on two real open-source projects, log noise, tune allow-list | S | FR9, Risk "noise" |

Gate 3 review happens here, with the CLI running on real CSS and SCSS.

## Gate 4: Release candidate

| Id | Ticket | Size | Covers |
| --- | --- | --- | --- |
| G4-01 | Vue SFC scanner: `<style>`, `style` and `class` in `<template>` (tests first) | L | FR2, AC3.4 |
| G4-02 | Tailwind class resolver: arbitrary values, default scale, v4 `@theme`, `@apply` (tests first) | L | AC2.5 |
| G4-03 | Ignore comments and suppression counts | S | AC2.6 |
| G4-04 | Config file loading and validation | M | AC2.7 |
| G4-05 | Suggested fixes as text: CSS custom property or Tailwind class | M | AC3.3 |
| G4-06 | JSON output and published schema | S | AC5.5 |
| G4-07 | Benchmark fixture (1,000 CSS, SCSS and Vue files) and CI time limit | S | NFR-P1, P3 |
| G4-08 | GitHub Action: scan files the PR touches, annotations, job summary | M | AC6.1, 6.2, 6.4, 6.5 |
| G4-09 | GitHub Action: single updating PR comment, fork fallback | M | AC6.3, 6.4, 6.6 |
| G4-10 | Playground shell: Vue 3 and Vite, layout and theme from DESIGN.md, self-hosted fonts, CSP | M | FR7, AC7.3 |
| G4-11 | Playground: text areas, file type picker, example, check in browser, findings list, live region | M | AC7.1, NFR-A4 |
| G4-12 | Playground: offline end-to-end test and bundle size check | S | AC7.2, 7.4 |
| G4-13 | README docs and three worked examples generated in CI | M | FR8 |
| G4-14 | Self-check in CI on playground source | S | FR9 |
| G4-15 | axe-core in CI, keyboard and screen reader pass, write-up | M | NFR-A |
| G4-16 | Security review and write-up | S | NFR-S6 |
| G4-17 | Design critique of the playground, with fixes | S | DESIGN.md |
| G4-18 | CONTRIBUTING.md | S | NFR-D5 |
| G4-19 | Release workflow: npm provenance, Action tags, SHA-pinned actions | M | NFR-S5 |

## Gate 5: Launch

| Id | Ticket | Size | Covers |
| --- | --- | --- | --- |
| G5-01 | Deploy playground to GitHub Pages | S | DoD 1 |
| G5-02 | Publish npm package v1.0.0 | S | DoD 2 |
| G5-03 | Publish the Action to the GitHub Marketplace | S | FR6 |
| G5-04 | Feedback log (`docs/FEEDBACK.md`) and outreach to first users | S | DoD 3 |
| G5-05 | Triage and fix the first round of user feedback | M | DoD 3 |
| G5-06 | Case study draft | M | DoD 4 |

## Later (not v1)

Moved out of v1 in the Gate 1 review. Details in `docs/SPEC.md` section 5.10. Not sized yet; each needs a spec update first.

- JSX and TSX scanner (`style` objects, `className` strings).
- `--changed-since` in the CLI and line-level "new drift only" in the Action.
- AI trope rules (impeccable covers these).
- Automatic fixes.
- Playground extras: code editor, click-to-line, URL sharing.
- Separate docs site.
- Font weight, line height and letter spacing checks.
- Svelte, Astro and plain HTML. SARIF output.
