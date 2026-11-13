# Backlog

Tickets in build order. One ticket per PR, aiming for under 300 changed lines.

Sizes: **S** is under 100 lines and a few hours. **M** is 100 to 300 lines. **L** is close to the 300-line limit or has unknowns; split it if it grows.

Requirement ids (FR, NFR, AC) refer to `docs/SPEC.md`.

## Gate 1: Spec

| Id | Ticket | Size | Covers |
| --- | --- | --- | --- |
| G1-01 | Spec, DESIGN.md, backlog, ADR 0001, status, README (this PR) | M | All |

## Gate 2: Architecture

| Id | Ticket | Size | Covers |
| --- | --- | --- | --- |
| G2-01 | ADR 0002: repo layout (one package or workspaces for core, CLI, Action, playground) and toolchain (Node, package manager, test runner) | S | NFR-D |
| G2-02 | ADR 0003: DESIGN.md parser, our own versus `@google/design.md/linter` | S | FR1 |
| G2-03 | ADR 0004: how we scan each file type (which parsers for CSS, SCSS, Vue, JSX; how line and column are tracked) | M | FR2, NFR-P |
| G2-04 | ADR 0005: colour distance (CIEDE2000 or OKLab) and nearest-token logic | S | FR3 |
| G2-05 | ADR 0006: hosting, CSP and release pipeline (npm provenance, Action versioning) | S | FR6, FR7, NFR-S, NFR-C |

## Gate 3: First working slice

| Id | Ticket | Size | Covers |
| --- | --- | --- | --- |
| G3-01 | Scaffold: TypeScript strict, ESLint, Prettier, test runner, coverage thresholds | S | NFR-D1 to D3 |
| G3-02 | CI workflow: lint, type check, tests, coverage on every PR. After this merges, `minor` PRs may merge on green. | S | NFR-D2 |
| G3-03 | Core types: token set, finding, report, JSON schema v1 | S | FR3, AC5.5 |
| G3-04 | Parser part 1: front matter, token groups, unknown content, errors (tests first) | M | AC1.1, 1.3, 1.4, 1.8 |
| G3-05 | Parser part 2: reference resolution and loops (tests first) | S | AC1.2 |
| G3-06 | Value normalisers: colour parsing to one space, rem and em to px (tests first) | M | AC1.5, 1.6 |
| G3-07 | Nearest-token matcher and `off-token` versus `raw-token-value` (tests first) | M | AC3.1, 3.2 |
| G3-08 | CSS and SCSS scanner with allow-list (tests first) | L | FR2, AC2.2 to 2.4 |
| G3-09 | CLI v0: `check`, text output, exit codes, file discovery and ignores | M | AC5.1 to 5.4, AC2.9 |
| G3-10 | Dogfood: run on this repo and on two real open-source projects, log noise, tune allow-list | S | FR9, Risk "noise" |

Gate 3 review happens here, with the CLI running on real CSS and SCSS.

## Gate 4: Release candidate

| Id | Ticket | Size | Covers |
| --- | --- | --- | --- |
| G4-01 | Vue SFC scanner: `<style>`, `style` and `class` in `<template>` (tests first) | L | FR2, AC3.4 |
| G4-02 | JSX and TSX scanner: `style` objects and `className` strings (tests first) | M | FR2 |
| G4-03 | Tailwind class resolver: arbitrary values, default scale, v4 `@theme` (tests first) | L | AC2.5 |
| G4-04 | Ignore comments and suppression counts | S | AC2.6 |
| G4-05 | Config file loading and validation | M | AC2.7 |
| G4-06 | Suggested fixes in the file's idiom | M | AC3.3 |
| G4-07 | JSON output and published schema | S | AC5.5 |
| G4-08 | `--changed-since` using git diff line ranges | M | AC5.6 |
| G4-09 | Benchmark fixture (1,000 files) and CI time limit | S | NFR-P1, P3 |
| G4-10 | AI trope rules (five rules, configurable) | M | FR4 |
| G4-11 | GitHub Action: scan changed files, annotations, job summary | M | AC6.1, 6.2, 6.4, 6.5 |
| G4-12 | GitHub Action: single updating PR comment, fork fallback | M | AC6.3, 6.4, 6.6 |
| G4-13 | Playground shell: Vue 3 and Vite, layout and theme from DESIGN.md, self-hosted fonts, CSP | M | FR7, AC7.4 |
| G4-14 | Playground: editors, run check in browser, report, click-to-line | L | AC7.1 to 7.3 |
| G4-15 | Playground: URL hash sharing, offline end-to-end test | S | AC7.2, 7.7 |
| G4-16 | Docs page and worked examples generated in CI | M | FR8 |
| G4-17 | Self-check in CI on playground source | S | FR9 |
| G4-18 | axe-core in CI, keyboard and screen reader pass, write-up | M | NFR-A |
| G4-19 | Security review and write-up | S | NFR-S6 |
| G4-20 | Design critique of the playground and docs, with fixes | S | DESIGN.md |
| G4-21 | CONTRIBUTING.md | S | NFR-D5 |
| G4-22 | Release workflow: npm provenance, Action tags, SHA-pinned actions | M | NFR-S5 |

## Gate 5: Launch

| Id | Ticket | Size | Covers |
| --- | --- | --- | --- |
| G5-01 | Deploy playground and docs to the chosen free host | S | DoD 1 |
| G5-02 | Publish npm package v1.0.0 | S | DoD 2 |
| G5-03 | Publish the Action to the GitHub Marketplace | S | FR6 |
| G5-04 | Feedback log (`docs/FEEDBACK.md`) and outreach to first users | S | DoD 3 |
| G5-05 | Triage and fix the first round of user feedback | M | DoD 3 |
| G5-06 | Case study draft | M | DoD 4 |

## Later (not v1)

- Font weight, line height and letter spacing checks.
- Svelte, Astro and plain HTML files.
- SARIF output for GitHub code scanning.
- CSS-in-JS libraries (styled-components, Emotion).
- Editor integration (VS Code problems panel).
