# Status

Last updated: 2026-11-13

## Done

- Gate 1 research: DESIGN.md spec (alpha, `@google/design.md` 0.4.0) and prior art on npm and the web. See `docs/SPEC.md` section 3.
- Gate 1 drafts: `docs/SPEC.md`, `DESIGN.md`, `docs/BACKLOG.md`, `docs/adr/0001-record-decisions.md`, `README.md`.

## Next

- Shawn reviews the Gate 1 PR and answers the open questions in `docs/SPEC.md` section 9.
- After approval: Gate 2 ADRs (backlog G2-01 to G2-05).

## Blocked

- Gate 2 is blocked on Gate 1 approval.
- Running `npx @google/design.md lint DESIGN.md` was blocked in the agent session. Shawn, please run it locally once.
- npm download counts (api.npmjs.org) and the GitHub repo for the DESIGN.md spec were not reachable from the agent session, so the prior-art review has no popularity numbers.

## Minor PRs merged without review

None yet. Minor merges are not allowed until the CI workflow exists (backlog G3-02).

| Date | PR | Summary |
| --- | --- | --- |
