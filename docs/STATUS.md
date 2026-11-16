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
- Draft GitHub issue for Google's design.md repo in `docs/drafts/google-issue.md` (minor PR 11, see table below). Shawn posts it himself.
- G3-08 matcher (merged, PR 12): exact matches are `raw-token-value` warnings, others `off-token` errors with the nearest token (OKLab for colours, px within the same category for sizes). Findings that involve `em` are marked `approximate` (review of PR 10). Written tests first.
- G3-09 CSS and SCSS scanner (merged, PR 13): finds hard-coded colours, font families, font sizes, spacing and radius values with exact line and column, using postcss, postcss-scss and postcss-value-parser. Written tests first.
- G3-10 CLI v0 (in review): `gryphon check` for CSS and SCSS, text and JSON output, exit codes 0, 1 and 2, `--design`, `--max-warnings`, file discovery that follows `.gitignore`. Written tests first.

## Next

- Shawn reviews G3-10 (not minor: the CLI is public API).
- G3-11 dogfooding runs the CLI, so it waits for G3-10 to merge. Then Gate 3 review.
- Open question from PR 9: did an editor pop up when Shawn ran Google's CLI? The answer decides whether section B of the issue draft stays.

## Blocked

- Nothing blocked.

## Gate 3: estimated versus actual size

Changed lines per PR, not counting `package-lock.json`, measured with `git diff --numstat` on each merge. Size bands from `docs/BACKLOG.md`: S under 100 lines, M 100 to 300, L about 300.

| Ticket | PR | Estimate | Actual lines | Of which tests | Actual band |
| --- | --- | --- | --- | --- | --- |
| G3-01 scaffold | 3 | S | 199 | 9 | M |
| G3-02 CI workflow | 4 | S | 59 | 0 | S |
| G3-03 core types | 6 | S | 359 | 126 | L |
| G3-04 parser part 1 | 7 | M | 735 | 323 | L, over 2x |
| G3-05 references | 8 | S | 361 | 138 | L |
| G3-06 parser comparison | 9 | S | 179 | 158 | M |
| G3-07 value normalisers | 10 | M | 340 | 165 | L |
| G3-08 matcher | 12 | M | 485 | 228 | L |
| G3-09 CSS and SCSS scanner | 13 | L | 496 | 238 | L, over |
| G3-10 CLI v0 | 14 | M | 571 | 254 | L, over |

What this says:

- **8 of 10 tickets came out at least one band larger than estimated.** Only G3-02 and G3-09 landed in their band. The estimates were too low, not the work too big.
- **Tests are the main reason.** On average tests are 43% of the lines. The size bands were set before "tests first" and the 80% floor, so they counted code only.
- **Proposal for Gate 4:** keep the bands, but count code only, and expect tests to add about the same again. Under that rule, most Gate 3 tickets would have been in band.

## Minor PRs merged without review

Allowed since PR 4 (CI) merged and its four checks became required on `main`. Each merged only with all four checks green.

| Date | PR | Summary |
| --- | --- | --- |
| 2026-11-15 | #5 | Dependabot for npm and GitHub Actions; accepted minimatch risk documented in SPEC 8.2. |
| 2026-11-16 | #11 | Draft issue for Google's design.md repo (typography references); corrected SPEC 10 and a test comment. Docs only. |
