# Status

Last updated: 2026-11-15

## Done

- Gate 1 approved and merged (PR 1).
- Gate 2 approved and merged (PR 2). ADRs 0001 to 0006 marked Accepted.
- G3-01 scaffold (merged, PR 3): npm workspaces, TypeScript 6.0.3 strict, ESLint with the browser-safety rule for `src/core`, Prettier, Vitest with 80% coverage floors on the parser and scanner folders. Tool versions confirmed with `npm view`; ADR 0002 corrected.
- G3-02 CI workflow (merged, PR 4): lint, format, type check and `npm audit` on Node 24, plus tests with coverage on Node 22, 24 and 26. Actions pinned by commit SHA. Shawn made the four checks required on `main`.
- Dependabot for npm and GitHub Actions, and the accepted `minimatch` risk documented in SPEC section 8.2 (minor PR, see table below).
- G3-03 core types (merged, PR 6): `TokenSet`, `Occurrence`, `Finding` and `Report` types, `buildReport` (sorting and counts), and the JSON report schema v1 with tests.
- G3-04 parser part 1 (merged, PR 7): front matter, token groups, components, unknown content, sections and errors, with line and column for every token. Written tests first.
- G3-05 references (merged, PR 8): `{colors.primary}` and chains of references resolve to their final value; broken, looping, too-deep and group references stop the run with an error naming the token. Written tests first.
- G3-06 parser comparison (merged, PR 9): CI compares our parser with Google's library on four DESIGN.md files. One known, explained difference. Google's empty CLI output is explained (SPEC section 10).
- G3-07 value normalisers (merged, PR 10): every DESIGN.md colour format, including color-mix(), to 8-bit sRGB and OKLab; px, rem and em to px. Written tests first.
- Draft GitHub issue for Google's design.md repo in `docs/drafts/google-issue.md` (minor PR, see table below). Shawn posts it himself.
- G3-08 matcher (in review, PR 12).
- G3-09 CSS and SCSS scanner (in review): finds hard-coded colours, font families, font sizes, spacing and radius values with exact line and column, using postcss, postcss-scss and postcss-value-parser. Written tests first.

## Next

- Shawn reviews G3-08 (PR 12) and G3-09 (new runtime dependencies and an npm override).
- G3-10 CLI v0 needs both the matcher and the scanner, so it waits for PR 12 and G3-09 to merge.
- Open question from PR 9: did an editor pop up when Shawn ran Google's CLI? The answer decides whether section B of the issue draft stays.

## Blocked

- Nothing blocked.

## Minor PRs merged without review

Allowed since PR 4 (CI) merged and its four checks became required on `main`. Each merged only with all four checks green.

| Date | PR | Summary |
| --- | --- | --- |
| 2026-11-15 | #5 | Dependabot for npm and GitHub Actions; accepted minimatch risk documented in SPEC 8.2. |
| 2026-11-16 | #11 | Draft issue for Google's design.md repo (typography references); corrected SPEC 10 and a test comment. Docs only. |
