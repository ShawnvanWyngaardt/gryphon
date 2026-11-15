# Status

Last updated: 2026-11-15

## Done

- Gate 1 research: DESIGN.md spec (alpha, `@google/design.md` 0.4.0) and prior art on npm and the web. See `docs/SPEC.md` section 3.
- Gate 1 drafts: `docs/SPEC.md`, `DESIGN.md`, `docs/BACKLOG.md`, `docs/adr/0001-record-decisions.md`, `README.md`.
- Gate 1 review fixes (15 November): v1 scope cut, backlog re-estimated and recounted by script, Google risk and fallback value added, label-caps raised to 13px, one recommendation each for parser, npm name and hosting.

## Next

- Shawn re-reviews PR 1 and decides on parser, npm name and hosting (SPEC section 9, A to C) and the six still-open questions.
- After approval: Gate 2 ADRs (backlog G2-01 to G2-05).

## Blocked

- Gate 2 is blocked on Gate 1 approval.
- Google's DESIGN.md linter could not be run: the session's safety check blocked `npx @google/design.md lint` twice. Needs a permission rule from Shawn (see SPEC section 10). I did not work around it.
- npm download counts (api.npmjs.org) and the GitHub repo for the DESIGN.md spec were not reachable from the agent session.

## Minor PRs merged without review

None yet. Minor merges are not allowed until the CI workflow exists (backlog G3-02).

| Date | PR | Summary |
| --- | --- | --- |
