# James the Gryphon: Specification

Status: draft for Gate 1 review. Nothing here is approved until Shawn signs off.

Research date: 13 November 2026.

## 1. Problem

Teams now describe their visual identity in a DESIGN.md file so that AI coding agents (Claude Code, Cursor, Codex, Stitch) build UI that looks like their product. The agents read it. They do not always follow it.

The result is drift. A `#6366F1` here, a `padding: 13px` there, a `rounded-2xl` card that nobody asked for, `font-family: Inter` because that is what the model saw most in training. Each one is small. Together they slowly turn a product into a generic AI-made app.

Today nobody catches this cheaply. Code review misses it because reviewers read logic, not hex values. Google's DESIGN.md linter checks that the DESIGN.md file is valid, but it never looks at the code. General token linters exist, but each needs its own token file and config, so the DESIGN.md and the linter config drift apart too.

## 2. Target users

1. **Frontend developers** who use an AI coding agent and keep a DESIGN.md. They want a fast check in their terminal and in CI that tells them what drifted and how to fix it.
2. **Designers** who own the DESIGN.md but do not read code daily. They want to paste a DESIGN.md and some code into a web page and see a readable report, with nothing to install.
3. **Tech leads** who want a PR gate that blocks new drift without blocking the team on old debt.

Primary stack for v1: Vue and React web apps, with plain CSS, SCSS or Tailwind.

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
4. `impeccable` does AI-trope detection far better than we will in v1 (62 rules versus our planned handful).

**Recommendation: proceed, but narrow the pitch.** Do not pivot. Do not try to beat impeccable at tropes.

How we differ:

- **DESIGN.md is the only config.** No second token file, no ESLint plugin setup. If it is in your DESIGN.md, it is enforced.
- **Works across styling approaches.** Plain CSS, SCSS, Vue `<style>` blocks, JSX `style` props and Tailwind classes, in one pass.
- **Only new drift in PRs.** The Action reports what this PR introduced, so teams with old debt can still adopt it on day one. None of the tools above lead with this.
- **Zero-install playground.** A designer can paste a DESIGN.md and code into a web page. Nothing leaves the browser. None of the tools above offer this.
- **Small and dependency-light.** No native binaries, no browser engine, no lint framework required.

What we cut or shrink because of the research: AI tropes become a small, optional rule set (FR4), and we point users to impeccable for deeper taste checks.

## 4. Goals and non-goals

### Goals

1. Catch off-token colours, font families, font sizes, spacing and radius values in UI source code, using only the project's DESIGN.md as config.
2. Tell the user exactly where each one is and what token to use instead.
3. Fit into the three places drift is caught: the terminal, the pull request, and a shared web page.
4. Be safe to run on private code: no network calls, no telemetry, no code execution of project files.
5. Be a credible portfolio piece: clear decisions, tested, accessible, documented.

### Non-goals for v1

- Automatic fixes (we suggest, we do not rewrite).
- Figma plugin.
- Mobile frameworks (React Native, Flutter, SwiftUI, Compose).
- Svelte, Angular, Astro, plain HTML files. (Likely next after v1. See open questions.)
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

**Changed:** added inline `style` props, an always-allowed list, token-definition files, ignore comments and a config file. Without these the tool produces so much noise on real projects that people turn it off.

Files: `.css`, `.scss`, `.vue` (`<style>` blocks, `style` attributes and `class` attributes in `<template>`), `.tsx` and `.jsx` (`style={{ }}` objects and `className` strings). Tailwind classes in any of these.

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
- AC2.4 Custom property definitions (`--brand: #1A1C1E;`) are not reported. Files listed as token sources in config (for example `src/tokens.css`) are skipped entirely.
- AC2.5 Tailwind: arbitrary values (`p-[13px]`, `bg-[#6366f1]`, `rounded-[10px]`) are resolved and checked. Default palette colour classes (`bg-indigo-500`) are reported unless the project's Tailwind v4 `@theme` CSS maps that name. Default scale classes (`p-4`, `rounded-lg`, `text-sm`) are resolved to their default values and checked against tokens. Variants and modifiers (`hover:`, `md:`, `!`, `/50` opacity) are handled.
- AC2.6 A comment `gryphon-ignore-next-line` (in CSS, JS or HTML comment syntax) suppresses findings on the next line. `gryphon-ignore-file` at the top suppresses the whole file. Every suppression is counted in the summary, so it cannot hide silently.
- AC2.7 A config file (`gryphon.config.json`) sets: DESIGN.md path, include and exclude globs, token source files, root font size, per-rule severity, and the trope list. All fields are optional. With no config file, defaults work on a standard Vite or Next.js project.
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
- AC3.3 The suggested fix is written in the idiom of the file: a CSS custom property for CSS, SCSS and Vue styles (naming follows `@google/design.md export --format css-tailwind` by default, configurable), a Tailwind class for Tailwind input, and the token path for JSX style objects.
- AC3.4 Line and column are correct for every file type, including values inside Vue `<template>` and multi-line JSX. Tested by golden files.
- AC3.5 Findings are sorted by file, then line, then column, so output is stable across runs.

### FR4. Warn on a short list of generic AI UI tropes (Should)

**Shrunk:** from a general trope detector to five rules, default severity warning, and the whole set can be switched off. Reason: impeccable already does this well with 62 rules. Our version only needs to catch the worst tells that slip through even when values are on-token.

Starting list (configurable):

1. `trope-purple-gradient`: a gradient with an indigo, violet or purple stop (hue range defined in code), in CSS or Tailwind `from-*`, `via-*`, `to-*`.
2. `trope-gradient-text`: `background-clip: text` with transparent text, or Tailwind `bg-clip-text text-transparent`.
3. `trope-glass`: `backdrop-filter: blur()` on a translucent white or light background.
4. `trope-card-soup`: the same "rounded large plus shadow plus padding" combination on more than N elements in one file (N configurable, default 5).
5. `trope-default-font`: Inter, Roboto, or the system font stack used when the DESIGN.md names a different family. (This overlaps `off-token`. It is reported once, as `off-token`, with a trope note.)

Acceptance criteria:

- AC4.1 Each rule has at least one positive and one negative fixture test.
- AC4.2 Each rule can be set to `off`, `warning` or `error` in config.
- AC4.3 The docs link to impeccable for deeper taste checks.
- AC4.4 No finding is reported twice under two rule ids.

### FR5. CLI (Must)

Acceptance criteria:

- AC5.1 `npx <package-name> check` runs with no install and no config on a standard project and finds `DESIGN.md` at the repo root.
- AC5.2 `--design <path>`, `--format text|json`, `--config <path>`, and file or glob arguments are supported. `--help` and `--version` work.
- AC5.3 Exit codes: `0` no errors (warnings allowed), `1` one or more errors, `2` the tool could not run (missing or invalid DESIGN.md, bad config). `--max-warnings <n>` turns warnings into a failure past n.
- AC5.4 Text output is readable in a terminal with and without colour. It respects `NO_COLOR`. It never uses colour as the only signal (labels "error" and "warning" are always printed).
- AC5.5 JSON output follows a documented, versioned schema (`schemaVersion` field). The schema is published in the repo and validated in tests.
- AC5.6 `--changed-since <git-ref>` limits findings to lines changed since that ref. **Added:** this is what makes adoption possible on projects with existing drift.
- AC5.7 The CLI makes no network requests. Tested by running the suite with networking blocked.

### FR6. GitHub Action (Must)

**Changed:** comment is updated in place, and only new drift is reported by default.

Acceptance criteria:

- AC6.1 Usable as `uses: <owner>/<repo>@v1` with no required inputs.
- AC6.2 On `pull_request`, it scans files changed in the PR and reports only findings on changed lines by default (`scope: changed`). `scope: all` scans the whole repo.
- AC6.3 It posts one summary comment on the PR and updates that same comment on later pushes, instead of adding a new one each time.
- AC6.4 It also writes inline annotations (GitHub workflow commands) and a job summary. On pull requests from forks, where the token cannot comment, it falls back to the job summary and annotations without failing.
- AC6.5 It fails the check when there are errors, unless `fail-on: never` is set.
- AC6.6 It needs only `contents: read` and `pull-requests: write` permissions, and the docs say so.
- AC6.7 Code never leaves the GitHub runner. The only outbound call is the GitHub API to post the comment.

### FR7. Web playground (Must)

Acceptance criteria:

- AC7.1 The user pastes a DESIGN.md and code (or picks a file type and a built-in example), presses "Check", and sees the same findings the CLI would give for the same input.
- AC7.2 The scan runs fully in the browser. After the page loads, no network request is made. Verified by an end-to-end test that blocks the network after load, and by a strict Content Security Policy (`connect-src 'none'`).
- AC7.3 Clicking a finding moves focus and the cursor to that line in the code editor.
- AC7.4 The playground follows this repo's DESIGN.md, and our own CLI passes on the playground source with zero errors.
- AC7.5 It loads in under 2 seconds on a mid-range laptop over a fast 4G profile (Lighthouse), and the JavaScript bundle is under 300 KB gzipped.
- AC7.6 It meets WCAG 2.2 AA (see NFR-A).
- AC7.7 Input is not stored anywhere except optionally in the URL hash (for sharing), which is never sent to a server. **Added** so people can share a report without a backend.

### FR8. Docs page with worked examples (Must)

Acceptance criteria:

- AC8.1 Covers: install, first run, reading the report, config reference, ignore comments, GitHub Action setup, JSON schema, privacy statement.
- AC8.2 At least four worked examples: plain CSS, Vue SFC, React with Tailwind, and a PR with only new drift reported. Each example shows input, command and real output.
- AC8.3 Example outputs are generated by running the CLI in CI, so docs cannot go stale.
- AC8.4 Lives in the same site as the playground and meets the same accessibility bar.

### FR9. Self-check (Must, Added)

**Added** because CLAUDE.md requires that the checker runs on this repo's own code.

- AC9.1 CI runs the CLI against this repo's DESIGN.md and the playground source on every PR, from the first PR where both exist.
- AC9.2 Any error fails CI.

## 6. Non-functional requirements

### Security and privacy (NFR-S)

- NFR-S1 No telemetry, analytics, crash reporting or update checks in the CLI, Action or playground. Acceptance: code search in CI for known telemetry packages, and a network-blocked test run.
- NFR-S2 No user code leaves the user's machine or browser. The Action's only outbound call is the GitHub API. Acceptance: AC5.7, AC6.7, AC7.2.
- NFR-S3 Dependencies are pinned to exact versions with a committed lockfile. No `postinstall` scripts in our package. Dependabot or Renovate (free) opens update PRs.
- NFR-S4 The tool never executes project files (no `require` of `tailwind.config.js`, no `eval`). It reads files as text only. **Added:** a linter that runs project code is a supply-chain risk.
- NFR-S5 The npm package is published with npm provenance from GitHub Actions. Actions we use are pinned by commit SHA.
- NFR-S6 A security review is done and written up before each release (Gate 4 and each later release).
- NFR-S7 The playground ships a strict Content Security Policy.

### Performance (NFR-P)

- NFR-P1 Scan 1,000 typical UI files (mean 150 lines each) in under 10 seconds wall time on a 4-core laptop with Node 22, excluding the one-time `npx` download. **Confirmed with a change:** I expect this to be easy [Guessing: we read text and use lightweight parsers, so 2 to 3 seconds seems likely, but I have not measured]. I propose we keep 10 seconds as the hard limit and add a benchmark fixture in CI that fails if a run on the CI runner exceeds 15 seconds (CI runners are slower than laptops).
- NFR-P2 The playground returns a report for 500 lines of code in under 500 ms.
- NFR-P3 Memory stays under 512 MB for the 1,000-file benchmark.

### Accessibility (NFR-A)

- NFR-A1 The playground and docs meet WCAG 2.2 AA.
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
- NFR-D7 Supported Node versions: current LTS lines only (22 and 24 as of today). **Added:** Node 18 and 20 are end of life, so supporting them adds cost with no benefit.

### Cost (NFR-C)

- NFR-C1 EUR 0 to build, run and host. Free tiers only: GitHub Actions on a public repo, GitHub Pages or Cloudflare Pages, the npm public registry.
- NFR-C2 If anything would need payment, stop and ask Shawn.

## 7. Definition of done (whole project)

1. Playground live on a public URL.
2. npm package published with provenance.
3. At least 3 real users. **Proposed definition:** a person other than Shawn who ran the tool on their own project (not a demo repo) and gave written feedback (issue, discussion, message). Logged in `docs/FEEDBACK.md`.
4. Case study written.

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Google adds code checking to `@google/design.md` | Medium | High | Lead on what they are unlikely to build: PR "new drift only", playground, Vue and Tailwind depth. Keep the core small so we can adapt. |
| DESIGN.md spec changes (it is alpha) | High | Medium | Pin the spec version we support. Isolate parsing behind one module. Track the spec repo. |
| Too much noise on real projects, users give up | High | High | Allow-list, ignore comments, `raw-token-value` as a warning, changed-lines-only in PRs. Test on two real open-source repos in Gate 3. |
| Tailwind resolution is wrong for customised themes | Medium | Medium | v1 reads Tailwind v4 `@theme` CSS only. Document that v3 JS configs are not executed. |
| Scope creep from tropes | Medium | Medium | FR4 is capped at five rules. |

## 9. Open questions for Shawn

Ranked by how much they change the plan.

1. **Proceed or pivot?** I recommend proceed with the narrower pitch in section 3.3. Do you agree, given that a Tailwind team can already get close with two existing tools?
2. **AI tropes (FR4):** keep five optional rules (my recommendation), or cut FR4 entirely and point to impeccable?
3. **Parser:** reuse Google's parser (`@google/design.md/linter`, Apache-2.0) or write our own? Reusing keeps us in sync with an alpha spec for free, but adds about nine transitive dependencies (unified, remark, zod, yaml and others) and makes "tests first for the parser" mostly about our adapter. Writing our own needs only `yaml`. I lean towards our own small parser plus a CI test that compares our output to Google's on their example files. This is formally a Gate 2 decision, but your view now changes FR1.
4. **npm package name:** `gryphon` is taken. `james-the-gryphon`, `gryphon-lint` and `designmd-drift` were free on 13 November 2026 [Likely: the registry returned 404, but npm can still reject names that are too similar to existing ones]. A scoped name like `@<your-npm-user>/gryphon` is always available. Which do you want?
5. **`raw-token-value` default:** warning (my recommendation), error, or off?
6. **Tailwind depth:** support Tailwind v4 `@theme` CSS only, and treat v3 projects as "default theme only"? Executing a v3 `tailwind.config.js` would break NFR-S4.
7. **Is the repo public?** Free unlimited Actions minutes and free GitHub Pages depend on it.
8. **Hosting:** GitHub Pages (simplest, same place as the code) or Cloudflare Pages (custom headers, so a real CSP header instead of a meta tag)? I lean to Cloudflare Pages for the CSP. Gate 2 decision.
9. **Real users:** do you agree with the definition in section 7? Who are your first three candidates?
10. **Light and dark tokens:** our DESIGN.md uses a `dark-` prefix because the spec has no modes. Fine for now, or wait for the spec?
11. **Fonts:** Atkinson Hyperlegible Next and Mono, self-hosted under the SIL Open Font License. Any objection?
12. **Next frameworks after v1:** Svelte, Astro or plain HTML? Only needed to keep the scanner design open.

## 10. Notes for the reviewer

- I could not run `npx @google/design.md lint DESIGN.md` in this session: running a freshly downloaded package was blocked. I checked our DESIGN.md with a small script instead: no broken references, no orphaned colours, every component text and background pair at 4.5:1 or more, sections in spec order. The official linter will likely give warnings for `borderColor`, an unknown component property that the spec says to "accept with warning". Please run it locally before approving.
- Spec facts above come from the spec file shipped inside `@google/design.md@0.4.0`. The GitHub repo itself was not reachable from this session.
