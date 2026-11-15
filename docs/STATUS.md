# Status

Last updated: 2026-11-15

## Done

- Gate 1 approved and merged (PR 1).
- Gate 2 approved and merged (PR 2). ADRs 0001 to 0006 marked Accepted.
- G3-01 scaffold (merged, PR 3): npm workspaces, TypeScript 6.0.3 strict, ESLint with the browser-safety rule for `src/core`, Prettier, Vitest with 80% coverage floors on the parser and scanner folders. Tool versions confirmed with `npm view`; ADR 0002 corrected.
- G3-02 CI workflow (merged, PR 4): lint, format, type check and `npm audit` on Node 24, plus tests with coverage on Node 22, 24 and 26. Actions pinned by commit SHA. Shawn made the four checks required on `main`.
- Dependabot for npm and GitHub Actions, and the accepted `minimatch` risk documented in SPEC section 8.2 (minor PR, see table below).
- G3-03 core types (in review): `TokenSet`, `Occurrence`, `Finding` and `Report` types, `buildReport` (sorting and counts), and the JSON report schema v1 with tests.

## Next

- Shawn reviews G3-03 (not minor: it defines the public JSON report and adds a dev dependency).
- G3-04 (parser part 1) waits for G3-03, because it uses the `TokenSet` type. It must not be stacked on an unmerged branch.

## Blocked

- Google's linter printed nothing on our DESIGN.md (Shawn's local run). Still to investigate in G3-06.

## Minor PRs merged without review

Allowed since PR 4 (CI) merged and its four checks became required on `main`. Each merged only with all four checks green.

| Date | PR | Summary |
| --- | --- | --- |
| 2026-11-15 | #5 | Dependabot for npm and GitHub Actions; accepted minimatch risk documented in SPEC 8.2. |
