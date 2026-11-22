# James the Gryphon: Specification

Status: draft for Gate 1 review. Nothing here is approved until Shawn signs off.

Research date: 13 November 2026. Revised after the Gate 1 review on 15 November 2026.

## 1. Problem

Teams now describe their visual identity in a DESIGN.md file so that AI coding agents (Claude Code, Cursor, Codex, Stitch) build UI that looks like their product. The agents read it. They do not always follow it.

The result is drift. A `#6366F1` here, a `padding: 13px` there, a `rounded-2xl` card that nobody asked for, `font-family: Inter` because that is what the model saw most in training. Each one is small. Together they slowly turn a product into a generic AI-made app.

Today nobody catches this cheaply. Code review misses it because reviewers read logic, not hex values. Google's DESIGN.md linter checks that the DESIGN.md file is valid, but it never looks at the code. General token linters exist, but each needs its own token file and config, so the DESIGN.md and the linter config drift apart too.

## 2. Target users

1. **Frontend developers** who use an AI coding agent and keep a DESIGN.md. They want a fast check in their terminal and in CI that tells them what drifted and how to fix it.
2. **Designers** who own the DESIGN.md but do not read code daily. They want to paste a DESIGN.md and some code into a web page and see a readable report, with nothing to install.
3. **Tech leads** who want a PR gate that blocks new drift without blocking the team on old debt.

Primary stack for v1: Vue web apps, and any web app styled with plain CSS, SCSS or Tailwind. React (JSX and TSX) follows after v1.

## 3. Prior art

I searched npm (registry search API) and the web on 13 November 2026. npm download counts were not reachable from this environment, so I could not compare popularity.

### 3.1 The format itself

| Item | Detail |
| --- | --- |
| Spec | DESIGN.md Format, version `alpha` |
| Source | [google-labs-code/design.md](https://github.com/google-labs-code/design.md), spec file `docs/spec.md` |
| Package | [`@google/design.md`](https://www.npmjs.com/package/@google/design.md) version 0.4.0, published 27 July 2026, Apache-2.0 |
| Also published at | [stitch.withgoogle.com/docs/design-md/specification](https://stitch.withgoogle.com/docs/design-md/specification) |

Facts that shape our design (read from the spec text shipped inside `@google/design.md@0.4.0`):

- A DESIGN.md is optional YAML front matter (the tokens) plus a Markdown body (the rationale). **Tokens are normative. Prose is context.**
- Token groups: `colors`, `typography` (fontFamily, fontSize, fontWeight, lineHeight, letterSpacing, fontFeature, fontVariation), `rounded`, `spacing`, `components`.
- Dimensions use `px`, `em` or `rem` only. Colours can be any CSS colour, including `oklch()` and `color-mix()`.
- References use `{colors.primary}` syntax.
- There are **no tokens for shadows, motion, breakpoints, z-index or border width**. We cannot check what the format cannot express.
- There is **no notion of light and dark modes**. Projects invent naming conventions (`dark-*`, `light-*`, nested groups).
- The spec is alpha. The format, schema and CLI are still moving.

### 3.2 Existing tools

| Tool | What it does | What it does not do |
| --- | --- | --- |
| [`@google/design.md`](https://www.npmjs.com/package/@google/design.md) (Google Labs) | Lints the DESIGN.md file: broken references, missing primary colour, WCAG contrast of component pairs, orphaned tokens, section order. Diffs two DESIGN.md files. Exports to Tailwind and W3C DTCG. Has a library API (`@google/design.md/linter`). | Never reads application code. Does not find hard-coded values in components. |
| [`stitch2`](https://www.npmjs.com/package/stitch2) | Design lab for agent-built HTML mockups. Renders screens in Playwright and checks them, including "colours written as values instead of DESIGN.md tokens" and text not matching a DESIGN.md type level. | Works on its own HTML screens in a `design/` folder, not on your Vue or React source. Needs Playwright and Chromium. No web playground. Heavy setup. |
| [`@sanjeevsaniel/inkwell-skill`](https://www.npmjs.com/package/@sanjeevsaniel/inkwell-skill) | Agent skill plus `check` command. Fails CI when DESIGN.md token values differ from the project's CSS custom property definitions. | Checks that token **definitions** match. Does not find hard-coded values in components. Assumes a specific file layout. Version 0.1.0, one week old. |
| [`impeccable`](https://www.npmjs.com/package/impeccable) | Scans HTML, CSS, JSX, TSX, Vue and Svelte with 62 deterministic rules for AI UI tells (purple gradients, gradient text, overused fonts, nested cards), accessibility and quality. JSON output and GitHub annotations. Mature (version 4.9.0). | Does not read a DESIGN.md. Its rules are generic taste rules, not "your tokens". Ships a native binary. |
| [`@shadcn/lint`](https://www.npmjs.com/package/@shadcn/lint) | Agent-first ESLint and Oxlint rules for Tailwind v4 design systems. React, Svelte and Vue. Flags arbitrary values, restyled components, suggests fixes from your theme. | Reads the Tailwind theme, not DESIGN.md. Tailwind only: plain CSS and SCSS are out. Needs ESLint or Oxlint config. |
| [`hardcode-replacer`](https://www.npmjs.com/package/hardcode-replacer) | Finds hard-coded colours and Tailwind colour classes, matches them to your CSS variable palette, and prints replacement code. | Colours only. No spacing, radius or type. Reads CSS variables, not DESIGN.md. |
| [`stylelint-design-token-guard`](https://www.npmjs.com/package/stylelint-design-token-guard) | Stylelint rule that enforces tokens from a JSON file, with suggestions. | CSS only (no JSX style props, no Tailwind). Needs a separate JSON token file. |
| [`@takazudo/zudo-design-token-lint`](https://www.npmjs.com/package/@takazudo/zudo-design-token-lint), [`@evilmartians/design-lint`](https://www.npmjs.com/package/@evilmartians/design-lint), [`eslint-plugin-tailwind-design-tokens`](https://www.npmjs.com/package/eslint-plugin-tailwind-design-tokens) | Tailwind class linters: flag raw palette classes and arbitrary values. | Tailwind only. No DESIGN.md. |
| Design-system-specific plugins: [Mozilla](https://firefox-source-docs.mozilla.org/code-quality/lint/linters/stylelint-plugin-mozilla/rules/use-design-tokens/color.html), [Atlassian](https://atlassian.design/components/eslint-plugin-design-system/ensure-design-token-usage), [Carbon](https://www.npmjs.com/package/stylelint-plugin-carbon-tokens) | Enforce one company's tokens. | Only work for that design system. |
| [`@thenavidm/design-md-generator`](https://www.npmjs.com/package/@thenavidm/design-md-generator), [`brandmd`](https://www.npmjs.com/package/brandmd), [`designmd-live`](https://www.npmjs.com/package/designmd-live) | Generate, extract or live-edit a DESIGN.md. | Do not check code. |

### 3.3 Honest verdict

**No tool I found does exactly what we plan.** [Likely, not certain: new DESIGN.md packages appear every week, and search is never complete.] The gap is: read the DESIGN.md as the only config, then scan normal Vue, React, CSS, SCSS and Tailwind source for off-token values, with a nearest-token fix, in a CLI, a PR check and a zero-install web page.

**But the gap is narrow, and I want Shawn to see that before we spend weeks on it.**

1. A Tailwind v4 team can already get most of the value today: run `npx @google/design.md export --format css-tailwind` to turn DESIGN.md into a Tailwind theme, then use `@shadcn/lint` with `no-arbitrary-values`. That is two tools and some config, but it works.
2. `stitch2` already checks DESIGN.md tokens against markup. If it adds a source-code mode, it overlaps us heavily.
3. Google could add a `check` command to `@google/design.md`. They own the format and already have the parser.
4. `impeccable` already does AI-trope detection well, with 62 rules.

**Decision (Shawn, Gate 1 review): proceed with the narrower pitch.** Do not pivot. Do not compete with impeccable on tropes.

How we differ:

- **DESIGN.md is the only config.** No second token file, no ESLint plugin setup. If it is in your DESIGN.md, it is enforced.
- **Works across styling approaches.** Plain CSS, SCSS, Vue `<style>` blocks, Vue templates and Tailwind classes, in one pass.
- **Scoped to the PR.** The Action checks only the files a PR touches, so a team with old debt elsewhere can adopt it on day one. (Line-level "new drift only" is planned for later. See section 5.10.)
- **Zero-install playground.** A designer can paste a DESIGN.md and code into a web page. Nothing leaves the browser. None of the tools above offer this.
- **Small and dependency-light.** No native binaries, no browser engine, no lint framework required.

What we cut because of the research and the Gate 1 review: AI trope rules move to "Later" (impeccable covers them), and we point users to impeccable for taste checks.

## 4. Goals and non-goals

### Goals

1. Catch off-token colours, font families, font sizes, spacing and radius values in UI source code, using only the project's DESIGN.md as config.
2. Tell the user exactly where each one is and what token to use instead.
3. Fit into the three places drift is caught: the terminal, the pull request, and a shared web page.
4. Be safe to run on private code: no network calls, no telemetry, no code execution of project files.
5. Be a credible portfolio piece: clear decisions, tested, accessible, documented.

### Non-goals for v1

- Automatic fixes. We print a suggested fix as text. We never rewrite files.
- JSX and TSX files, AI trope rules, `--changed-since` and line-level PR filtering. Moved to "Later" in the Gate 1 review (section 5.10).
- Figma plugin.
- Mobile frameworks (React Native, Flutter, SwiftUI, Compose).
- Svelte, Angular, Astro, plain HTML files.
- CSS-in-JS libraries beyond inline `style` objects (styled-components, Emotion template literals, vanilla-extract).
- Checking things DESIGN.md has no tokens for: shadows, motion, breakpoints, z-index, border width, opacity.
- Font weight, line height and letter spacing checks. The format has these tokens, but each one adds edge cases. Planned for v1.1.
- Validating the DESIGN.md itself. Google's linter already does this. We will tell users to run it.
- Reading the Markdown prose rules ("Don't use more than two weights"). Prose is for humans and agents. We only enforce tokens.
- Executing `tailwind.config.js` or any project JavaScript (security, see NFR-S4).

## 5. Functional requirements

Priority uses MoSCoW: Must, Should, Could.

Changes from the starting list are marked **Changed**, **Added** or **Shrunk**, with the reason.

### FR1. Parse DESIGN.md into a token set (Must)

Read a DESIGN.md that follows the alpha spec and produce a normalised token set: colours, font families, font sizes, spacing values and radius values, each with its token path and original value.

**Changed:** added reference resolution, unknown-content behaviour and mode handling, because real files use all three.

Acceptance criteria:

- AC1.1 Given the example DESIGN.md from the official spec, the parser returns every colour, typography, rounded and spacing token with its path (for example `colors.primary`) and value.
- AC1.2 Token references like `{colors.primary}` resolve to their final value. A reference loop or a broken reference produces a clear error naming the token path, and the run exits with code 2.
- AC1.3 Unknown token names and unknown sections are accepted, as the spec requires. A duplicate section heading is rejected, as the spec requires.
- AC1.4 A file with no front matter produces a clear message ("No design tokens found in DESIGN.md") and exit code 2, not an empty pass.
- AC1.5 Colour values in all spec formats (hex 3, 4, 6, 8 digits, named, rgb, hsl, hwb, oklch, oklab, lab, lch) are parsed and converted to a common colour space for comparison. The original string is kept for display.
- AC1.6 `rem` and `em` values are converted to px using a configurable root size (default 16px) for comparison. The original is kept for display.
- AC1.7 Tokens with a `dark-` or `light-` prefix, or nested under a `dark` or `light` group, are treated as normal tokens (any of them makes a value on-token).
- AC1.8 Line and column of each token in the DESIGN.md are recorded, so the report can link to the definition.
- AC1.9 Unit test coverage of the parser is at least 80% (lines and branches).

### FR2. Scan source files for hard-coded values (Must)

**Changed:** added an always-allowed list, token-definition files, ignore comments and a config file. Without these the tool produces so much noise on real projects that people turn it off. **Narrowed in Gate 1 review:** JSX and TSX moved to "Later".

Files: `.css`, `.scss`, `.vue` (`<style>` blocks, `style` attributes and `class` attributes in `<template>`). Tailwind classes in Vue `class` attributes (static and simple `:class` string or array literals) and in `@apply` rules in CSS, SCSS and Vue styles.

Properties checked:

| Category | CSS properties |
| --- | --- |
| Colour | `color`, `background`, `background-color`, `border*-color`, `border` shorthand colour part, `outline-color`, `fill`, `stroke`, `text-decoration-color`, `caret-color`, `accent-color`, gradient colour stops |
| Font family | `font-family`, `font` shorthand family part |
| Font size | `font-size`, `font` shorthand size part |
| Spacing | `margin*`, `padding*`, `gap`, `row-gap`, `column-gap`, `inset*`, `top`, `right`, `bottom`, `left` |
| Radius | `border-radius` and its longhands |

Acceptance criteria:

- AC2.1 A fixture project containing one off-token value per category per file type is scanned, and every planted value is reported. No other values are reported. (Golden-file test.)
- AC2.2 Always allowed, never reported: `0`, `auto`, `inherit`, `initial`, `unset`, `revert`, `currentColor`, `transparent`, `none`, percentages, viewport units, `calc()` that only combines tokens or allowed values, `var(--anything)`, SCSS variables (`$x`), and CSS keywords like `inherit` in `font-family` stacks.
- AC2.3 Generic font family keywords (`serif`, `sans-serif`, `monospace`, `system-ui`) at the end of a stack are allowed. Any named family not in the DESIGN.md is reported.
- AC2.3a **Changed by decision D1 (PR 15):** only the first family of a font stack is checked, in `font-family` and in the `font` shorthand. Fallbacks only render when the first font fails, so they are not a design choice. If the first entry is a variable or a function, the stack is not checked. Found in G3-11 dogfooding.
- AC2.4 Custom property definitions (`--brand: #1A1C1E;`) are not reported. Files listed as token sources in config (for example `src/tokens.css`) are skipped entirely.
- AC2.4a **Changed by decision D3 (PR 15):** custom property definitions are skipped only in token files. A token file is one listed in `tokenSources` in the config; without that setting, a file that defines custom properties in a `:root` rule. Elsewhere, colours in custom property definitions are checked as local redefinitions. Sizes and fonts in custom properties are not checked, because their category cannot be known from the value. SCSS `$variable` definitions are still skipped. Found in G3-11, where the club shift scheduler had 20 local colour variables.
- AC2.5 Tailwind: arbitrary values (`p-[13px]`, `bg-[#6366f1]`, `rounded-[10px]`) are resolved and checked. Default palette colour classes (`bg-indigo-500`) are reported unless the project's Tailwind v4 `@theme` CSS maps that name. Default scale classes (`p-4`, `rounded-lg`, `text-sm`) are resolved to their default values and checked against tokens. Variants and modifiers (`hover:`, `md:`, `!`, `/50` opacity) are handled.
- AC2.6 A comment `gryphon-ignore-next-line` (in CSS or HTML comment syntax) suppresses findings on the next line. `gryphon-ignore-file` at the top suppresses the whole file. Every suppression is counted in the summary, so it cannot hide silently.
- AC2.7 A config file (`gryphon.config.json`) sets: DESIGN.md path, include and exclude globs, token source files, root font size, and per-rule severity. All fields are optional. With no config file, defaults work on a standard Vite or Nuxt project.
- AC2.8 Files that fail to parse are reported as "skipped: could not parse" with the reason, and do not stop the run.
- AC2.9 `node_modules`, `dist`, `build`, `.git` and files in `.gitignore` are skipped by default.
- AC2.10 Unit test coverage of the scanner is at least 80% (lines and branches).

### FR3. Report each finding with location, nearest token and fix (Must)

**Changed:** added a separate rule for hard-coded values that equal a token, and a defined distance measure, so "nearest" means something testable.

Each finding has: rule id, severity, file, line, column, the found value, the property, the nearest token (path and value), the distance, and a suggested fix.

Two rules:

- `off-token` (default: error). The value matches no token.
- `raw-token-value` (default: warning). The value equals a token's value but is written as a raw literal, so it will not follow a future token change.

Acceptance criteria:

- AC3.1 Colour distance uses CIEDE2000 (or OKLab Euclidean distance, decided at Gate 2) on the converted colours. The nearest colour token is the one with the smallest distance. Ties go to the token defined first.
- AC3.2 Dimension distance is the absolute difference in px. Only tokens of the same category are compared (spacing values are matched to `spacing`, radius to `rounded`, font sizes to `typography.*.fontSize`).
- AC3.2a **Changed by decision D2 (PR 15):** a category that DESIGN.md has no usable tokens for (colours, font families, font sizes, spacing or radius) is not checked. The CLI prints one notice per such category on stderr, for example "DESIGN.md defines no spacing tokens, so spacing was not checked." Found in G3-11 dogfooding, where this caused 124 of 164 findings.
- AC3.3 The suggested fix is printed as text in the idiom of the file: a CSS custom property for CSS, SCSS and Vue styles (naming follows `@google/design.md export --format css-tailwind` by default, configurable) and a Tailwind class for Tailwind input. The tool never edits the file.
- AC3.4 Line and column are correct for every file type, including values inside Vue `<template>` and `style` attributes. Tested by golden files.
- AC3.5 Findings are sorted by file, then line, then column, so output is stable across runs.

### FR4. AI UI trope rules (moved to Later)

Moved to "Later" in the Gate 1 review. impeccable already detects AI UI tropes with 62 rules, so building our own adds little. The docs point to impeccable instead (AC8.1). The five-rule draft is kept in section 5.10 for reference.

### FR5. CLI (Must)

Acceptance criteria:

- AC5.1 `npx <package-name> check` runs with no install and no config on a standard project and finds `DESIGN.md` at the repo root.
- AC5.2 `--design <path>`, `--format text|json`, `--config <path>`, and file or glob arguments are supported. `--help` and `--version` work.
- AC5.3 Exit codes: `0` no errors (warnings allowed), `1` one or more errors, `2` the tool could not run (missing or invalid DESIGN.md, bad config). `--max-warnings <n>` turns warnings into a failure past n.
- AC5.4 Text output is readable in a terminal with and without colour. It respects `NO_COLOR`. It never uses colour as the only signal (labels "error" and "warning" are always printed).
- AC5.5 JSON output follows a documented, versioned schema (`schemaVersion` field). The schema is published in the repo and validated in tests.
- AC5.6 The CLI makes no network requests. Tested by running the suite with networking blocked.

### FR6. GitHub Action (Must)

**Changed:** the comment is updated in place, and only files the PR touches are scanned by default. **Narrowed in Gate 1 review:** line-level filtering moved to "Later".

Acceptance criteria:

- AC6.1 Usable as `uses: <owner>/<repo>@v1` with no required inputs.
- AC6.2 On `pull_request`, it scans only the files the PR adds or modifies, using the PR's file list from the GitHub API (`scope: changed`, the default). `scope: all` scans the whole repo. Findings anywhere in a touched file are reported, including old ones, and the comment says so.
- AC6.3 It posts one summary comment on the PR and updates that same comment on later pushes, instead of adding a new one each time.
- AC6.4 It also writes inline annotations (GitHub workflow commands) and a job summary. On pull requests from forks, where the token cannot comment, it falls back to the job summary and annotations without failing.
- AC6.5 It fails the check when there are errors, unless `fail-on: never` is set.
- AC6.6 It needs only `contents: read` and `pull-requests: write` permissions, and the docs say so.
- AC6.7 Code never leaves the GitHub runner. The only outbound call is the GitHub API to post the comment.

### FR7. Minimal web playground (Must)

**Narrowed in Gate 1 review** to a minimal version. Minimal means: two plain text areas (DESIGN.md and code), a file type picker (CSS, SCSS, Vue), one built-in example, a "Check" button and a findings list. No code editor component, no syntax highlighting. Click-to-line and URL sharing move to "Later".

Acceptance criteria:

- AC7.1 The user pastes a DESIGN.md and code (or loads the built-in example), picks the file type, presses "Check", and sees the same findings the CLI would give for the same input.
- AC7.2 The scan runs fully in the browser. After the page loads, no network request is made. Verified by an end-to-end test that blocks the network after load, and by a strict Content Security Policy (`connect-src 'none'`).
- AC7.3 The playground follows this repo's DESIGN.md, and our own CLI passes on the playground source with zero errors.
- AC7.4 It loads in under 2 seconds on a mid-range laptop over a fast 4G profile (Lighthouse), and the JavaScript bundle is under 150 KB gzipped. (Lowered from 300 KB because there is no editor component.)
- AC7.5 It meets WCAG 2.2 AA (see NFR-A).
- AC7.6 Input is never stored or sent anywhere. Reloading the page clears it.

### FR8. Docs (Must, reduced)

**Reduced** to match the smaller v1. Shawn's v1 list in the Gate 1 review does not name docs. I kept a small version because the original requirements, the definition of done and real users all need a way to learn the tool. See open question 1 in section 9.

Acceptance criteria:

- AC8.1 The README covers: install, first run, reading the report, config reference, ignore comments, GitHub Action setup, JSON schema, privacy statement, and a pointer to impeccable for AI trope checks.
- AC8.2 Three worked examples: plain CSS, Vue SFC with Tailwind classes, and a GitHub Action run on a PR. Each shows input, command and real output.
- AC8.3 Example outputs are generated by running the CLI in CI, so docs cannot go stale.
- AC8.4 A separate docs site is "Later". The playground links to the README.

### FR9. Self-check (Must, Added)

**Added** because CLAUDE.md requires that the checker runs on this repo's own code.

- AC9.1 CI runs the CLI against this repo's DESIGN.md and the playground source on every PR, from the first PR where both exist.
- AC9.2 Any error fails CI.

### 5.10 Later (moved out of v1 in the Gate 1 review)

These are not v1. Each needs its own spec update and approval before work starts.

- **JSX and TSX scanning:** `style={{ }}` objects and `className` strings in React files, with fixes written as token paths.
- **AI trope rules:** the five-rule draft was purple and indigo gradients, gradient text, glassmorphism, repeated "rounded plus shadow" cards, and default fonts. impeccable covers these already.
- **`--changed-since <git-ref>`** in the CLI, and **line-level "new drift only"** in the Action. Trade-off of moving these: until they ship, a PR that touches an old file also shows that file's old findings. The PR comment says which findings sit on lines the PR did not change, once that data exists.
- **Automatic fixes:** rewriting files. Until then we only print suggested fixes.
- **Playground extras:** code editor with highlighting, click-to-line, URL hash sharing.
- **Docs site** separate from the README.
- **More checks:** font weight, line height, letter spacing.
- **More file types:** Svelte, Astro, plain HTML. SARIF output.

## 6. Non-functional requirements

### Security and privacy (NFR-S)

- NFR-S1 No telemetry, analytics, crash reporting or update checks in the CLI, Action or playground. Acceptance: code search in CI for known telemetry packages, and a network-blocked test run.
- NFR-S2 No user code leaves the user's machine or browser. The Action's only outbound call is the GitHub API. Acceptance: AC5.6, AC6.7, AC7.2.
- NFR-S3 Dependencies are pinned to exact versions with a committed lockfile. No `postinstall` scripts in our package. Dependabot or Renovate (free) opens update PRs.
- NFR-S4 The tool never executes project files (no `require` of `tailwind.config.js`, no `eval`). It reads files as text only. **Added:** a linter that runs project code is a supply-chain risk.
- NFR-S5 The npm package is published with npm provenance from GitHub Actions. Actions we use are pinned by commit SHA.
- NFR-S6 A security review is done and written up before each release (Gate 4 and each later release).
- NFR-S7 The playground ships a strict Content Security Policy.

### Performance (NFR-P)

- NFR-P1 Scan 1,000 typical UI files (a mix of CSS, SCSS and Vue, mean 150 lines each) in under 10 seconds wall time on a 4-core laptop with Node 22, excluding the one-time `npx` download. **Confirmed with a change:** I expect this to be easy (measured in G4-07, 22 November 2026: about 1.3 to 1.7 seconds for 1,000 generated CSS, SCSS and Vue files with 71,515 findings, Node start-up included; the earlier guess was 2 to 3 seconds). 10 seconds is the laptop target. `npm run bench` (G4-07) checks it in CI, where it fails above 15 seconds because CI runners are slower than laptops. It also fails if any generated file is skipped, so a broken fixture cannot pass as fast.
- NFR-P2 The playground returns a report for 500 lines of code in under 500 ms.
- NFR-P3 Memory stays under 512 MB for the 1,000-file benchmark.

### Accessibility (NFR-A)

- NFR-A1 The playground meets WCAG 2.2 AA.
- NFR-A2 Automated: axe-core checks run in CI on every page and fail on any violation.
- NFR-A3 Manual: before release, a keyboard-only pass and a screen reader pass (VoiceOver or NVDA) are done and written up.
- NFR-A4 Findings are announced to screen readers (live region with a count). Focus moves to the report heading after a check.
- NFR-A5 CLI text output does not rely on colour alone (AC5.4).

### Developer experience (NFR-D)

- NFR-D1 TypeScript strict mode everywhere.
- NFR-D2 ESLint and Prettier run on every PR in GitHub Actions, along with type check and tests.
- NFR-D3 At least 80% line and branch coverage on the parser and the scanner, enforced in CI.
- NFR-D4 Tests are written before code for the parser and the scanner.
- NFR-D5 CONTRIBUTING.md explains setup, scripts, the PR process and the gates.
- NFR-D6 Every architectural decision has an ADR in `docs/adr/`.
- NFR-D7 Supported Node versions: current LTS lines only: 22 (from 22.13), 24 and 26 as of 15 November 2026. CI tests all three. **Added:** Node 18 and 20 are end of life, so supporting them adds cost with no benefit.

### Cost (NFR-C)

- NFR-C1 EUR 0 to build, run and host. Free tiers only: GitHub Actions and GitHub Pages on this public repo, the npm public registry.
- NFR-C2 If anything would need payment, stop and ask Shawn.

## 7. Definition of done (whole project)

1. Playground live on a public URL.
2. npm package published with provenance.
3. At least 3 real users, **at least 2 of them not Shawn** (decided at Gate 2). A real user ran the tool on their own project (not a demo repo) and gave written feedback (issue, discussion or message). Shawn counts through his own project, the club shift scheduler. Each user is logged in `docs/FEEDBACK.md`.
4. Case study written.

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Google ships its own `check` command in `@google/design.md` | Medium | High | See section 8.1. |
| DESIGN.md spec changes (it is alpha) | High | Medium | Pin the spec version we support. Isolate parsing behind one module. Compare our parser with Google's in CI (section 9, decision A). |
| Too much noise on real projects, users give up | High | High | Allow-list, ignore comments, `raw-token-value` as a warning, PR scope limited to touched files. Test on two real open-source repos in Gate 3. |
| PR comments show old drift in touched files, because line-level filtering is "Later" | High | Medium | The comment states that findings may predate the PR. Line-level filtering is first in line after v1. |
| Tailwind resolution is wrong for customised themes | Medium | Medium | v1 reads Tailwind v4 `@theme` CSS only. Document that v3 JS configs are not executed. |
| Name confusion with other "gryphon" packages | Low | Low | Use `gryphon-designmd` on npm. See section 9, decision B. |

### 8.1 If Google ships its own check command

Google owns the format and already has the parser, the linter and a CLI. Adding a `check` command that scans code is a natural next step for them. I rate it Medium likelihood [Guessing: nothing public points to it, but it is the obvious gap in their tool].

If it happens, the core idea (read DESIGN.md, flag off-token values in code) stops being unique. Being honest about what is left:

**What gryphon is still worth:**

1. **The browser playground.** Google's tool is a CLI. A designer who does not use a terminal can still paste a DESIGN.md and code into our page, with nothing installed and nothing sent anywhere.
2. **The PR workflow.** A ready GitHub Action that posts one updating comment, with a fork fallback. A CLI alone does not give a team that.
3. **Framework depth.** Vue templates, `style` attributes and Tailwind classes resolved to values. A format owner is likely to start with plain CSS.
4. **The case study.** Shawn's portfolio goal does not depend on gryphon staying unique. A well-run, documented, gated project is still the evidence.

**What would not survive:** "the only tool that reads DESIGN.md and checks code" as the headline. We would stop pitching that.

**What we would do:** if Google's command covers plain CSS well, we make our scanner a thin layer on top of theirs, or contribute our Vue and Tailwind scanning upstream. We keep the playground and the Action as our own products. Keeping the parser and scanner behind small interfaces (Gate 2) keeps this switch cheap.

### 8.2 Accepted risks

**Audit policy (Shawn, PR 25, 17 November 2026):** the required check on every PR audits runtime dependencies only (`npm audit --omit=dev --audit-level=high`). A separate workflow (`audit.yml`) runs the full audit, dev tools included, weekly and on every push to `main`. It is not required, so it shows dev advisories without blocking unrelated work. Dependabot security alerts should be on: a repo setting only Shawn can switch on. Every accepted dev advisory is listed below.

Risks we know about and chose to live with. Each has an owner decision and a trigger to look again.

| Risk | Decided | Why accepted | Look again when |
| --- | --- | --- | --- |
| `minimatch` 10.2.6 inside typescript-eslint has a moderate denial-of-service advisory ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)). The fix exists only in minimatch 11, which typescript-eslint does not accept yet. | Shawn, review of PR 3, 15 November 2026 | Dev-only tool, never shipped to users. It only sees glob patterns from our own lint config. Forcing minimatch 11 with an override would run the linter on a version it was not tested with. | typescript-eslint moves to minimatch 11 (Dependabot will propose it), or the advisory is raised above moderate. CI fails on high and critical advisories. |
| `picomatch` up to 4.0.7 has a high denial-of-service advisory (catastrophic backtracking on single-branch repeated extglobs, [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), CVE-2026-112366). No fixed version exists; upstream has no merged fix (micromatch/picomatch issue 234, PR 246 open). | Shawn, PR 25, 17 November 2026 (option C) | Dev-only: used by vitest, vite and typescript-eslint to match our own test and source globs. Nothing we ship depends on it (`npm ls --omit=dev` finds no picomatch). Exploiting it needs an attacker-controlled glob pattern; ours come from our own config files. | A fixed picomatch is released (Dependabot will propose it), or it reaches runtime dependencies. |

## 9. Decisions

All decisions below were made by Shawn when approving Gate 1 on 15 November 2026 (PR 1). The reasoning behind A to C is kept so the choices can be explained later.

### Scope

- Proceed or pivot: **proceed** with the narrower pitch.
- AI trope rules: **cut from v1**, moved to "Later".
- v1 scope: CSS and SCSS, Vue and Tailwind scanners, CLI, GitHub Action, minimal playground.
- Repo visibility: **public** (checked 15 November 2026), so GitHub Actions minutes and GitHub Pages are free.

### A. Parser: our own, tested against Google's in CI (approved)

- Our parser uses one runtime dependency, `yaml`, to read the front matter, plus our own code for references, units and colours. Markdown prose is only split into `##` sections, which needs no Markdown library.
- `@google/design.md` is a **dev dependency only**. A CI test runs Google's code and our parser on the same files and fails if the token sets differ. Details in ADR 0003.
- Why not reuse Google's parser at runtime: 9 direct dependencies (unified, remark-parse, remark-frontmatter, remark-mdx, remark-stringify, unist-util-visit, yaml, zod, citty), plus their transitive ones. All of them would land in the playground bundle (150 KB budget) and in every security review.
- What we give up: when the alpha spec changes, we update our parser by hand. The CI comparison test tells us when.

### B. npm name: `gryphon-designmd` (approved)

- `gryphon` is taken by an unrelated 0.0.0 placeholder from 2014. `gryphon-designmd` was free on 15 November 2026.
- The command users type can still be `gryphon` (the `bin` name).
- **No placeholder publish until Gate 5.** Until then the name is not reserved, and we accept the small risk that someone takes it.

### C. Hosting: GitHub Pages (approved)

- Free for this public repo, deployed by GitHub's own Pages Actions, no new account.
- The CSP is set in a `<meta>` tag. That supports `connect-src 'none'`, but not `frame-ancestors`. Details in ADR 0006.

### Answers to the open questions

1. **Docs:** keep the reduced version (README plus three generated examples, FR8).
2. **`raw-token-value`:** warning by default.
3. **Tailwind:** v4 `@theme` only. v3 projects get the default theme. Never execute a config file (NFR-S4).
4. **Real users:** at least 3, at least 2 of them not Shawn (settled at Gate 2, replacing the Gate 1 wording). Shawn counts through the club shift scheduler. He names the other users before Gate 5. Section 7 matches.
5. **Light and dark tokens:** keep the `dark-` prefix until the spec adds modes.
6. **Fonts:** Atkinson Hyperlegible Next and Mono, self-hosted: approved.

## 10. Notes

- **Google's linter on our DESIGN.md (resolved in G3-06, 16 November 2026).** Shawn's local run of `npx -y @google/design.md@0.4.0 lint DESIGN.md` printed nothing and exited 0. Running Google's library on the same file gives: **0 errors, 3 warnings, 1 info**. The warnings are our three `borderColor` component properties, and the info is the token summary (23 colours, 10 typography levels, 3 radii, 10 spacing values, 18 components). So the file is fine, and the earlier run never reached the linter.
  - Why it printed nothing: the CLI's `lint` command always prints JSON, so empty output means it never ran. Likely cause [Guessing, not reproduced]: the command is named `design.md`. On Windows, `cmd.exe` looks in the current folder before `PATH`, finds our `DESIGN.md` (Windows ignores case), and opens it with the `.md` file association. That prints nothing and exits 0.
  - Workaround: the package also ships the command `designmd`, without the dot: `npx -y -p @google/design.md@0.4.0 designmd lint DESIGN.md`.
- **Where we knowingly differ from Google's parser** (checked in CI by `compare-google.test.ts`): Google 0.4.0 does not resolve references inside typography levels. `fontSize`, `lineHeight` and `letterSpacing` references are dropped with no warning, a `fontFamily` reference is kept as literal text, and a `fontWeight` reference is reported as an error. It also drops a unitless `lineHeight`. The spec allows references to any primitive value, so we resolve them. Details and a reproduction are in `docs/drafts/google-issue.md`.
- Spec facts above come from the spec file shipped inside `@google/design.md@0.4.0`. The GitHub repo itself was not reachable from the agent session.
