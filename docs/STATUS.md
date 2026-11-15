# Status

Last updated: 2026-11-15

## Done

- **Gate 1 approved and merged** (PR 1). Decisions recorded in `docs/SPEC.md` section 9.
- Gate 2 drafts: ADRs 0002 to 0006 (backlog G2-01 to G2-05) in one PR, as Shawn asked.
  - 0002 repo layout and toolchain
  - 0003 DESIGN.md parser
  - 0004 scanning approach
  - 0005 matching values to tokens
  - 0006 hosting, CSP and release pipeline

## Next

- Shawn reviews the Gate 2 PR and approves the five ADRs as a whole.
- After approval: Gate 3, starting with G3-01 (scaffold) and G3-02 (CI workflow).

## Blocked

- Gate 3 is blocked on Gate 2 approval.
- Open conflict for Shawn: SPEC section 7 says a real user is "a person other than Shawn", but the Gate 1 answer counts Shawn as one of the three. Needs one wording before Gate 5.
- Google's linter printed nothing and exited 0 on our DESIGN.md (Shawn's local run). Unexplained. To be investigated first thing in G3-06.

## Minor PRs merged without review

None yet. Minor merges are not allowed until the CI workflow exists (backlog G3-02).

| Date | PR | Summary |
| --- | --- | --- |
