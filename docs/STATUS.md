# Status

Last updated: 2026-11-15

## Done

- Gate 1 approved and merged (PR 1).
- Gate 2 approved and merged (PR 2). ADRs 0001 to 0006 marked Accepted.
- G3-01 scaffold (in review): npm workspaces, TypeScript 6.0.3 strict, ESLint with the browser-safety rule for `src/core`, Prettier, Vitest with 80% coverage floors on the parser and scanner folders. Tool versions confirmed with `npm view`; ADR 0002 corrected. SPEC real-user wording fixed.
- G3-02 CI workflow (in review, stacked on G3-01): lint, format, type check and `npm audit` on Node 24, plus tests with coverage on Node 22, 24 and 26. Actions pinned by commit SHA.

## Next

- Shawn reviews G3-01, then G3-02 (CI workflow), which is stacked on it.
- After G3-02 merges: Shawn marks the CI checks as required in the repo's branch protection settings. Only then can `minor` PRs merge on green.
- After both merge: G3-03 (core types).

## Blocked

- `minor` PRs cannot merge without review until G3-02 (CI) is merged and its checks are required on `main`.
- Decision needed in G3-01: accept a moderate, dev-only `minimatch` advisory inside typescript-eslint, or force a newer version with an override. See the G3-01 PR.
- Google's linter printed nothing on our DESIGN.md (Shawn's local run). Still to investigate in G3-06.

## Minor PRs merged without review

None yet. Minor merges are not allowed until the CI workflow exists (backlog G3-02).

| Date | PR | Summary |
| --- | --- | --- |
