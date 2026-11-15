# 0002. Repo layout and toolchain

- Status: Accepted
- Date: 2026-11-15
- Deciders: Shawn (product owner), Claude Code (engineer)

## Context

We ship three things from one codebase: an npm CLI (`gryphon-designmd`), a GitHub Action, and a browser playground. All three must give the same findings for the same input, so they must share one checking engine. That engine has to run in Node and in the browser.

We are one reviewer and one agent working in short sessions. Every extra package, config file and tool is something Shawn has to understand and review.

## Options considered

**Layout**

1. **One package, playground in a subfolder with its own `package.json`.** Simple, but two lockfiles and the playground imports the engine through a relative path.
2. **npm workspaces with two packages (chosen).** A private root holds shared dev tools. `packages/gryphon-designmd` holds the engine, the CLI and the Action source, and is the only thing published. `playground/` is a private Vue app that depends on it through the workspace.
3. **Four packages (core, cli, action, playground).** Cleanest boundaries, but we would publish and version several npm packages. Too much ceremony for v1.

**Package manager:** npm (chosen, ships with Node) versus pnpm (faster and stricter, but one more tool to install and explain).

**Test runner:** Vitest (chosen, same config style as Vite, built-in coverage thresholds) versus `node:test` (zero dependencies, but weaker coverage and Vue support).

## Decision

```
/                       private root: ESLint, Prettier, TypeScript, Vitest config
packages/gryphon-designmd/
  src/core/             parser, scanners, matcher. No Node APIs. Runs in the browser.
  src/cli/              CLI entry. Node only.
  src/action/           GitHub Action entry. Node only.
playground/             Vue 3 + Vite app. Imports src/core only.
action.yml              Action metadata. Must sit at the repo root for `uses: owner/repo@v1`.
action/dist/index.js    Bundled Action, committed (ADR 0006).
docs/                   spec, ADRs, status
```

- **The browser-safe boundary is enforced by a lint rule:** `src/core` may not import `node:*` modules, `fs` or `process`. File reading happens in the CLI and the Action, which pass text into the core.
- **Node on an LTS line, at least 22.13:** `^22.13.0 || ^24.0.0 || >=26.0.0`. ESLint 10 needs 22.13. Vite 8 needs 22.12. Vitest 5 does not support Node 23 or 25. Node 22, 24 and 26 are the LTS lines today.
- **TypeScript 6.0.x, pinned, strict.** Not 7.0. TypeScript 7 is the new native compiler, and typescript-eslint supports only TypeScript below 6.1 today, so 7.0 would break linting. We move to 7 when the lint tooling supports it.
- **ESM only.** No CommonJS build.
- **Tools:** npm workspaces, Vitest with V8 coverage, ESLint with typescript-eslint and eslint-plugin-vue, Prettier, vue-tsc for the playground, esbuild to bundle the Action (ADR 0006).
- All versions are pinned exactly, with one committed lockfile (NFR-S3).

## Versions confirmed (G3-01, 15 November 2026)

Checked with `npm view` and the official Node release index, as Shawn asked when approving Gate 2.

| Tool | ADR said | Confirmed | Note |
| --- | --- | --- | --- |
| Node | 22.13+, LTS lines 22 and 24 | 22.13+, LTS lines **22, 24 and 26** | Node 26 became LTS in October 2026. Corrected above. |
| ESLint | 10 | 10.15.0, needs Node `^22.13.0` or `>=24` | Correct. |
| Vite | 8, needs 22.13 | 8.3.8, needs Node `>=22.12.0` | The 22.13 floor comes from ESLint, not Vite. Corrected above. |
| TypeScript | 6.0.x, not 7 | 6.0.3 pinned. `latest` is 7.0.2. typescript-eslint 8.72.2 supports `<6.1.0` | Correct. |
| Vitest | (not stated) | 5.1.0, needs Node `^22.12.0`, `^24` or `>=26` | Added the odd-version exclusion above. |

Correction note: ADR 0001 says accepted ADRs are only edited for typos. These are factual corrections that Shawn asked for in the Gate 2 approval, so they are made here with this note, not in a new ADR. The decisions themselves did not change.

## What we give up

- Workspaces add one level of folders and a root config. In return we get one lockfile and one place for tools.
- We do not get pnpm's stricter dependency isolation.
- We stay one major TypeScript version behind the newest release for a while.
- The CLI and Action are in one published package, so a user who only wants the Action still gets the CLI. It is small, so this is acceptable.
