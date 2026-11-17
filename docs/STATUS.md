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
- G3-10 CLI v0 (merged, PR 14): `gryphon check` for CSS and SCSS, text and JSON output, exit codes 0, 1 and 2, `--design`, `--max-warnings`, file discovery that follows `.gitignore`. Written tests first.
- G3-11 dogfooding (merged, PR 15; Gate 3 approved): CLI run on this repo, the club shift scheduler and VitePress. 164 findings logged in `docs/DOGFOOD.md`; two false-positive causes fixed (`@font-face`, `-apple-system`). Gate 4 re-estimated in `docs/BACKLOG.md`.
- G4-01 Vue scanner (merged, PR 18): `<style>` and `<style lang="scss">` blocks and static `style` attributes in `.vue` files, with positions in the `.vue` file; the CLI now checks `.vue`. Written tests first.
- G4-21 D2 (merged, PR 19): categories DESIGN.md has no tokens for are not checked; one notice each on stderr. VitePress dogfood run: 119 findings to 0, with 4 notices. ADR 0004 notes the 29 KB compiler-dom measurement (review of PR 18).
- G4-20 D1 (merged, PR 20): only the first family of a font stack is checked. Scheduler `main.css`: the `'Segoe UI'` and `Roboto` fallbacks are gone, `'Inter'` stays.
- G4-04 config file (merged, PR 21): `gryphon.config.json` or `--config`, plain JSON, validated: `design`, `include`, `exclude`, `tokenSources`, `rootPx`, `rules`. Summary says "in the checked categories" when categories were skipped (review of PR 19). Written tests first.
- G4-22 D3 (in review): colours in custom property definitions outside token files are checked. The scheduler's 20 local colour variables are now reported (8 repeat a token, 12 are not tokens); VitePress stays at 0.

## Next

- **Gate 3 approved (PR 15).** D1, D2 and D3 approved.
- Gate 4 order (Shawn, PR 15): G4-01 Vue scanner, then D2 (G4-21), D1 (G4-20), config file (G4-04) with D3 (G4-22), then the re-run on the club shift scheduler (G4-23). Tailwind, the Action and the playground after that.
- G4-23 waits for Shawn's real DESIGN.md for the scheduler.
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
| G3-11 dogfooding | 15 | S | 492 | 18 | S in code (14 lines); the rest is the findings log and derived DESIGN.md files |

What this says:

- **8 of 10 code tickets came out at least one band larger than estimated** (G3-11 is mostly docs and is left out of this count). Only G3-02 and G3-09 landed in their band. The estimates were too low, not the work too big.
- **Tests are the main reason.** On average tests are 43% of the lines. The size bands were set before "tests first" and the 80% floor, so they counted code only.
- **Proposal for Gate 4:** keep the bands, but count code only, and expect tests to add about the same again. Under that rule, most Gate 3 tickets would have been in band.

## Minor PRs merged without review

Allowed since PR 4 (CI) merged and its four checks became required on `main`. Each merged only with all four checks green.

| Date | PR | Summary |
| --- | --- | --- |
| 2026-11-15 | #5 | Dependabot for npm and GitHub Actions; accepted minimatch risk documented in SPEC 8.2. |
| 2026-11-16 | #11 | Draft issue for Google's design.md repo (typography references); corrected SPEC 10 and a test comment. Docs only. |
| 2026-11-17 | #16 | `npm run gryphon` for local use, README "Run it locally", CI smoke test of the built CLI, and a path fix for folders outside the current one. |
| 2026-11-17 | #17 | Gate 4 re-ordered by user value, as Shawn decided in PR 15; D1 to D3 marked approved; new ticket G4-23 (scheduler re-run). Docs only. |
