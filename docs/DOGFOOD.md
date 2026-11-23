# Dogfooding

Real runs of gryphon on real projects, newest first. Each run says what the tool got right, what it got wrong, and what it changed in the backlog.

## G4-23: club shift scheduler with its own DESIGN.md

Date: 23 November 2026. CLI: `main` after PR 27 (Vue, D1 to D3, config file and ignore comments). Scheduler commit: `e310ba2`.

### Summary

- **This is the first run against the project's own DESIGN.md,** not one I derived. I changed nothing in it for this run.
- **28 files checked, 6,408 lines, 452 findings (150 errors, 302 warnings), in about 390 ms.** All 25 Vue files were read, with all 24 `<style>` blocks. In G3-11 the tool could read 2 files and found 10 problems.
- **Every position is exact.** A script checked that all 452 findings point at their value in the source line. 452 of 452 did.
- **No false positives in the sense of G3-11:** the tool never misread the code. But many findings are correct and still not worth acting on, and the reasons are below.
- **The big wins:**
  - **D3 works.** The 20 local colour variables in `HeroSection.vue`, `HowItWorks.vue` and `ProjectAbout.vue` are all reported. That was the most important gap in G3-11.
  - **148 spacing warnings can be fixed today:** the value is a `--space-*` variable that already exists in `main.css`.
- **The big problem:** **120 font size warnings cannot be acted on.** DESIGN.md has a type scale, but no CSS variable defines it, so "use the token instead" points at nothing. This is the main input for G4-05 (suggested fixes).

### Which file is the DESIGN.md

The scheduler repo has two:

| File | Front matter | Result |
| --- | --- | --- |
| `design.md` | None: prose only | `No design tokens found in DESIGN.md`, exit 2 |
| `DESIGN.draft.md` | Colours, typography, radius, spacing | The run below |

`DESIGN.draft.md` and the repo's `gryphon.config.json` (with `tokenSources` for `main.css` and `coordinator.css`) came in the same commit, so I used the draft. The prose of the two files is the same.

Two things a first-time user would hit:

- `gryphon check` with no `--design` looks for `DESIGN.md`. On Linux it does not find `design.md`, and the config has no `design` field. The error is clear, but it does not mention the file that is there.
- `No design tokens found` does not say that tokens go in YAML front matter. A user who wrote a careful prose DESIGN.md, as Shawn did, gets no hint why.

### Results by category

| Category | Errors (`off-token`) | Warnings (`raw-token-value`) | Verdict |
| --- | --- | --- | --- |
| Colour | 17 | 21 | TP. Errors are near-copies of tokens (`#f8f5fb`, `#f7f5fb`), alpha variants and untokened colours such as `#053b2a`. 18 of 21 warnings have a CSS variable with the same value. |
| Font family | 0 | 2 | TP, low value. `'Inter'` and `"Roboto Mono"` are tokens, but there is no `--font-body` variable to use instead. |
| Font size | 15 | 120 | Errors are TP (sizes off the scale, such as `19px`, `22px`, `0.85rem`). **Warnings are correct but not actionable:** no CSS variable defines a font size. |
| Spacing | 96 | 151 | 148 warnings are actionable (`--space-*` exists). 12 errors are `20px`, which the prose allows but the YAML does not list. 5 errors are `top` and `left` offsets. The rest are real drift (`10px`, `6px`, `14px`, `28px`, `36px`). |
| Radius | 22 | 8 | 16 errors are `4px`, `12px` and `14px`: the prose describes them (button and input corners), the YAML does not. The other 6 are real drift. |

Findings per file: `WeekView.vue` 50, `MemberList.vue` 46, `HowItWorks.vue` 39, `coordinator.css` 36, `OverviewView.vue` 36, `HeroSection.vue` 32, and 18 more files with 1 to 27 each.

### What the tool got wrong or could do better

These are product findings, not bugs in the scanner. None is fixed in this PR.

1. **Two palettes, one token list.** The scheduler has a member palette and a coordinator palette, and its DESIGN.md says "never mix them". gryphon has no idea of scope, so the nearest token can come from the wrong side. Example: `--hero-muted: #6b5d73` in `HeroSection.vue`, which uses the plum palette, is matched to the coordinator token `colors.muted`, and `#f8f5fb` to the coordinator `colors.bg` instead of the member `color-bg`. Following that advice would break the project's own rule.
2. **Font size tokens without CSS variables** (120 warnings). The DESIGN.md token exists, the CSS variable does not. Suggested fixes (G4-05) need to know whether a variable exists before they suggest one.
3. **AC3.3's default naming would give wrong fixes here.** AC3.3 says a suggested fix names the CSS variable the way `@google/design.md export --format css-tailwind` would. For this DESIGN.md that export gives `--color-navy`, `--color-color-bg` and `--text-secondary`, but the project uses `--navy`, `--color-bg` and no font size variables. Worse, the export's `--color-bg` is the coordinator `#f7f8fa`, while the project's own `--color-bg` is the member `#fcf7ff`. A fix saying "use `var(--color-bg)`" would change the colour. G4-05 needs a decision before it starts (see STATUS).
4. **Equal values, one name.** `#fff` is reported as `colors.surface`, but on a navy button the right token is `colors.on-navy`, which has the same value. The matcher names the first token it finds.
5. **Offsets count as spacing.** SPEC FR2 puts `top`, `left`, `right`, `bottom` and `inset` under spacing. Here that gave 5 errors for optical alignment (`left: 23px`, `top: 2px`), and one even has a comment explaining the value. That is the case ignore comments (G4-03) are for.
6. **Missing-file hints**, from the section above: mention a `design.md` with another case, and explain front matter when no tokens are found.

### For Shawn as the scheduler's owner

Not gryphon work, but the run found these in the scheduler's design system:

- The YAML is missing values the prose allows: spacing `20px`, and radius `4px`, `12px` and `14px`. Adding them removes 28 errors.
- `colors.danger` (`#C62828`) has no CSS variable, so `CheckInShift.vue` and `coordinator.css` hard-code it.
- 3 Vue files define 10 local variables that repeat 6 token colours (`--hero-orange`, `--how-plum` and so on), instead of using the existing variables. One of them, `--how-blue`, repeats the coordinator `--navy`.
- `gryphon.config.json` could set `"design": "DESIGN.draft.md"`, so a plain `gryphon check` works.

### How to repeat this run

From the scheduler's root, at commit `e310ba2`, with gryphon built from `main`:

```bash
node /path/to/gryphon/packages/gryphon-designmd/dist/src/cli/main.js check --design DESIGN.draft.md --format json
```

Counts in this section were made from that JSON by script, not typed by hand.

## G3-11: first run on three projects


Date: 17 November 2026. CLI version: `gryphon-designmd` 0.0.0 at the merge of PR 14, built locally.
The CLI reads `.css` and `.scss` only, until Vue support lands in G4-01.

### Summary

- **3 projects, 13 files, about 3,400 lines of CSS, 164 findings.** No crashes, no skipped files. Every position I spot-checked (all 11 scheduler findings and 10 VitePress findings) points at the right line and column.
- **35 findings were false positives, and both causes are fixed in this PR:**
  - `@font-face` declarations were read as font usages (34 findings);
  - `-apple-system` was not treated as a system font name (1 finding).
- **2 findings are clearly useful:**
  - the scheduler's body font is `Inter`, which is not a token, and the file itself says "Inter to be replaced";
  - a `4px` radius where the tokens are 8px, 16px and 999px.
- **127 findings are correct by the current rules but low value.** 124 of them come from one cause: a project with no tokens for a category (spacing, radius or font size) gets every value in that category reported. That is decision D2.
- **The most important finding is something the tool cannot see yet.** The scheduler's Vue files define 20 local colour variables. 8 of them repeat a token under a new name, and the other 12 use 7 distinct colours that are not tokens at all, some of them near-copies of tokens. gryphon skips every custom property definition (AC2.4), so it would miss all of this, even after G4-01. That is decision D3.
- **Speed:** about 150 ms per project run, including Node start-up (11 files, 2,895 lines for VitePress).

Verdicts used below: **TP** (true positive: real drift), **TP, low value** (correct under the spec, but not worth acting on), **FP** (false positive: the tool was wrong).

### How the runs were done

None of the three projects has a real DESIGN.md:
- this repo has one, but no CSS yet;
- the scheduler and VitePress have none.

For the scheduler and VitePress, I turned each project's own token file (its `:root` custom properties) into a DESIGN.md with a small mechanical script, mapping colours, `--space-*`, `--radius-*` and font stacks. So each project is checked against the design system it already has, not one I invented.

The derived files are in `docs/dogfood/`, each with its source file, commit and the list of skipped variables. The script is not part of the product.

| Project | Commit | Files checked | DESIGN.md used |
| --- | --- | --- | --- |
| This repo (gryphon) | `main` after PR 14 | 0 | `DESIGN.md` |
| [club-shift-scheduler](https://github.com/ShawnvanWyngaardt/club-shift-scheduler) | `50645ff` | 2 (`main.css`, `utilities.scss`) | `docs/dogfood/club-shift-scheduler.DESIGN.md`, from `frontend/src/assets/main.css` |
| [vuejs/vitepress](https://github.com/vuejs/vitepress) (MIT) | `40b2e09` | 11 (default theme styles) | `docs/dogfood/vitepress.DESIGN.md`, from `src/client/theme-default/styles/vars.css` |

### Results per project

#### This repo

- **0 files checked.** The playground, our first CSS, arrives in Gate 4.
- **3 DESIGN.md warnings**, for our three `borderColor` component properties. These are correct: Google's linter gives the same three (PR 9).
- **Re-run when the playground exists (G4-10),** and from then on in CI (FR9, G4-14).

#### Club shift scheduler

- **Not testable until G4-01:** almost all the styles live in Vue files: 21 `<style scoped>` blocks, 1,222 lines. The CLI could only read `main.css` (435 lines) and `utilities.scss` (51 lines).
- **Colours are well disciplined in the CSS the tool can read.** Outside `:root`, every colour goes through `var()`. 0 colour findings, and I found no missed colours by hand.
- **Fonts:**
  - `'Inter'` is a real finding;
  - `-apple-system` was a false positive, now fixed;
  - `'Segoe UI'` and `Roboto` are correct under AC2.3, but they are fallbacks in a system stack. See D1.
- **Sizes:**
  - 5 font sizes, because the project has no type scale tokens. See D2.
  - One `4px` radius, a real finding.
  - One `-2px` optical nudge, correct but low value.
- **What the tool cannot see** (checked by hand for D3): 20 local colour variables in 3 Vue files (`HeroSection.vue`, `HowItWorks.vue`, `ProjectAbout.vue`).
  - 8 repeat a token under a new name, for example `--how-orange: #f34213` is `--color-accent-secondary`.
  - The other 12 use 7 colours that are not tokens. Some are near-copies of tokens: `#f8f5fb` and `#f7f5fb` against the token `#fcf7ff`.

#### VitePress

- **0 colour findings.** VitePress routes every colour through its `--vp-c-*` variables, and the tool correctly stays quiet.
- **34 false positives, all in `fonts.css`:** `font-family` inside `@font-face` blocks. Now skipped.
- **119 spacing, radius and font size findings, every one saying "DESIGN.md defines no ... values".** VitePress has no tokens for these categories, so this is correct by the rules, but it is noise. See D2.

### Tuning done in this PR

| Change | Why | Effect |
| --- | --- | --- |
| Skip declarations inside `@font-face` | They define a font, they do not use one. Same principle as AC2.4. | -34 findings on VitePress |
| Allow `-apple-system` and `BlinkMacSystemFont` | Vendor names for the system font, like `system-ui`, which AC2.3 already allows. | -1 finding on the scheduler |

Both changes have tests written first. After tuning: the scheduler has 10 findings, VitePress 119.

### Decisions for Shawn

**All three approved by Shawn in PR 15 (17 November 2026).** They are backlog tickets G4-20 (D1), G4-21 (D2) and G4-22 (D3), scheduled straight after G4-01. The re-run is G4-23, after Shawn writes a real DESIGN.md for the scheduler.

These change approved behaviour, so I did not make them myself.

**D1. Check only the first family in a font stack?**
- AC2.3 says every named family not in DESIGN.md is reported, so fallbacks like `'Segoe UI', Roboto` are reported too.
- Fallbacks only render when the main font fails to load. They are not a design choice.
- **Recommendation:** check only the first named family.
- Effect here: -2 findings on the scheduler.

**D2. What should happen when DESIGN.md has no tokens at all for a category?**
- Today every value in that category is an error: 124 of the 164 findings.
- **Recommendation:** skip the category and print one notice instead, for example "DESIGN.md defines no spacing tokens; spacing was not checked."
- That matches the spec's own `omitted` idea, and Google's linter treats missing sections as information, not errors.
- Effect here: -119 on VitePress, -5 on the scheduler.

**D3. Check custom property definitions outside the token file?**
- AC2.4 skips every definition, which hides the scheduler's local colour redefinitions.
- **Recommendation:** skip definitions only in token source files. Those come from config (G4-04), defaulting to files with a `:root` block that defines tokens. Elsewhere, check them like any other value.
- This is the single change that would most improve real-world results.

### Re-run plan

| When | What |
| --- | --- |
| G4-01 (Vue scanner) | Re-run the scheduler, with all 21 Vue style blocks. Expect real findings in components. |
| After D3 | Re-run the scheduler, to confirm the 20 local colour variables are reported. |
| G4-02 (Tailwind) | Add a Tailwind project to the dogfood set. |
| G4-10 (playground) | Re-run this repo; from then on in CI (G4-14). |

The scheduler is also the first project that should get a **real** DESIGN.md. Shawn, as its owner, is the right person to write it: you are the target user, and your experience writing it is case study material.

### Every finding

Generated from the JSON output of the run before tuning, so no row is typed by hand.

#### Club shift scheduler: all findings (before tuning)

| # | Where | Property | Value | Verdict | Why |
| --- | --- | --- | --- | --- | --- |
| 1 | `frontend/src/assets/main.css:60:5` | `font-family` | `'Inter'` | TP | Primary body font, not a token. The file itself says "Inter to be replaced". |
| 2 | `frontend/src/assets/main.css:62:5` | `font-family` | `-apple-system` | FP, fixed | Vendor name for the system font, like `system-ui`. Now allowed. |
| 3 | `frontend/src/assets/main.css:63:5` | `font-family` | `'Segoe UI'` | TP, low value | Fallback in a system font stack. Correct under AC2.3; see decision D1. |
| 4 | `frontend/src/assets/main.css:64:5` | `font-family` | `Roboto` | TP, low value | Fallback in a system font stack. Correct under AC2.3; see decision D1. |
| 5 | `frontend/src/assets/main.css:92:14` | `font-size` | `1.75rem` | TP, low value | No type scale in the tokens, so every size is off-token. See decision D2. |
| 6 | `frontend/src/assets/main.css:96:14` | `font-size` | `1.125rem` | TP, low value | No type scale in the tokens, so every size is off-token. See decision D2. |
| 7 | `frontend/src/assets/main.css:101:14` | `font-size` | `1rem` | TP, low value | No type scale in the tokens, so every size is off-token. See decision D2. |
| 8 | `frontend/src/assets/main.css:107:14` | `font-size` | `0.875rem` | TP, low value | No type scale in the tokens, so every size is off-token. See decision D2. |
| 9 | `frontend/src/assets/main.css:157:14` | `font-size` | `0.875rem` | TP, low value | No type scale in the tokens, so every size is off-token. See decision D2. |
| 10 | `frontend/src/assets/main.css:191:18` | `border-radius` | `4px` | TP | 4px radius; the tokens have 8px, 16px and 999px. |
| 11 | `frontend/src/assets/main.css:204:15` | `margin-top` | `-2px` | TP, low value | A 2px optical nudge on a checkbox tick. Correct, but rarely worth a token. |

#### VitePress: all findings (before tuning)

| # | Where | Property | Value | Verdict | Why |
| --- | --- | --- | --- | --- | --- |
| 1 | `src/client/theme-default/styles/base.css:68:16` | `font-size` | `1em` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 2 | `src/client/theme-default/styles/base.css:84:13` | `bottom` | `-0.25em` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 3 | `src/client/theme-default/styles/base.css:88:10` | `top` | `-0.5em` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 4 | `src/client/theme-default/styles/base.css:153:27` | `padding-inline-start` | `1.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 5 | `src/client/theme-default/styles/base.css:157:24` | `margin-inline-end` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 6 | `src/client/theme-default/styles/components/custom-block.css:3:18` | `border-radius` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 7 | `src/client/theme-default/styles/components/custom-block.css:4:12` | `padding` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 8 | `src/client/theme-default/styles/components/custom-block.css:4:19` | `padding` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 9 | `src/client/theme-default/styles/components/custom-block.css:12:16` | `padding-top` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 10 | `src/client/theme-default/styles/components/custom-block.css:179:11` | `margin` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 11 | `src/client/theme-default/styles/components/custom-block.css:183:15` | `margin` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 12 | `src/client/theme-default/styles/components/custom-block.css:190:11` | `margin` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 13 | `src/client/theme-default/styles/components/vp-code-group.css:2:15` | `margin-top` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 14 | `src/client/theme-default/styles/components/vp-code-group.css:8:18` | `margin-inline` | `-1.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 15 | `src/client/theme-default/styles/components/vp-code-group.css:9:14` | `padding` | `0.75rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 16 | `src/client/theme-default/styles/components/vp-code-group.css:19:20` | `border-radius` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 17 | `src/client/theme-default/styles/components/vp-code-group.css:19:27` | `border-radius` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 18 | `src/client/theme-default/styles/components/vp-code-group.css:33:14` | `padding` | `0.75rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 19 | `src/client/theme-default/styles/components/vp-code-group.css:35:14` | `font-size` | `0.875rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 20 | `src/client/theme-default/styles/components/vp-code-group.css:45:17` | `inset-inline` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 21 | `src/client/theme-default/styles/components/vp-code-group.css:46:11` | `bottom` | `-1px` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 22 | `src/client/theme-default/styles/components/vp-code-group.css:49:18` | `border-radius` | `2px` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 23 | `src/client/theme-default/styles/components/vp-code-group.css:81:12` | `padding` | `1.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 24 | `src/client/theme-default/styles/components/vp-code-group.css:81:20` | `padding` | `1.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 25 | `src/client/theme-default/styles/components/vp-doc.css:44:14` | `font-size` | `1.75rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 26 | `src/client/theme-default/styles/components/vp-doc.css:48:11` | `margin` | `3rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 27 | `src/client/theme-default/styles/components/vp-doc.css:48:18` | `margin` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 28 | `src/client/theme-default/styles/components/vp-doc.css:50:16` | `padding-top` | `1.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 29 | `src/client/theme-default/styles/components/vp-doc.css:53:14` | `font-size` | `1.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 30 | `src/client/theme-default/styles/components/vp-doc.css:59:11` | `margin` | `2rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 31 | `src/client/theme-default/styles/components/vp-doc.css:62:14` | `font-size` | `1.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 32 | `src/client/theme-default/styles/components/vp-doc.css:66:11` | `margin` | `1.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 33 | `src/client/theme-default/styles/components/vp-doc.css:69:14` | `font-size` | `1.125rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 34 | `src/client/theme-default/styles/components/vp-doc.css:76:24` | `margin-inline-start` | `-0.87em` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 35 | `src/client/theme-default/styles/components/vp-doc.css:109:16` | `font-size` | `2rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 36 | `src/client/theme-default/styles/components/vp-doc.css:114:8` | `top` | `1.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 37 | `src/client/theme-default/styles/components/vp-doc.css:124:11` | `margin` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 38 | `src/client/theme-default/styles/components/vp-doc.css:132:11` | `margin` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 39 | `src/client/theme-default/styles/components/vp-doc.css:134:25` | `padding-inline-start` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 40 | `src/client/theme-default/styles/components/vp-doc.css:141:14` | `font-size` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 41 | `src/client/theme-default/styles/components/vp-doc.css:169:25` | `padding-inline-start` | `1.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 42 | `src/client/theme-default/styles/components/vp-doc.css:170:11` | `margin` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 43 | `src/client/theme-default/styles/components/vp-doc.css:182:15` | `margin-top` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 44 | `src/client/theme-default/styles/components/vp-doc.css:187:11` | `margin` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 45 | `src/client/theme-default/styles/components/vp-doc.css:203:19` | `margin-block` | `0.125rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 46 | `src/client/theme-default/styles/components/vp-doc.css:204:18` | `margin-inline` | `-1.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 47 | `src/client/theme-default/styles/components/vp-doc.css:204:27` | `margin-inline` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 48 | `src/client/theme-default/styles/components/vp-doc.css:224:14` | `font-size` | `0.875rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 49 | `src/client/theme-default/styles/components/vp-doc.css:234:11` | `margin` | `1.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 50 | `src/client/theme-default/styles/components/vp-doc.css:251:12` | `padding` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 51 | `src/client/theme-default/styles/components/vp-doc.css:251:19` | `padding` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 52 | `src/client/theme-default/styles/components/vp-doc.css:256:14` | `font-size` | `0.875rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 53 | `src/client/theme-default/styles/components/vp-doc.css:263:14` | `font-size` | `0.875rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 54 | `src/client/theme-default/styles/components/vp-doc.css:271:11` | `margin` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 55 | `src/client/theme-default/styles/components/vp-doc.css:281:11` | `margin` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 56 | `src/client/theme-default/styles/components/vp-doc.css:285:11` | `margin` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 57 | `src/client/theme-default/styles/components/vp-doc.css:294:11` | `margin` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 58 | `src/client/theme-default/styles/components/vp-doc.css:295:18` | `border-radius` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 59 | `src/client/theme-default/styles/components/vp-doc.css:305:15` | `margin-top` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 60 | `src/client/theme-default/styles/components/vp-doc.css:310:18` | `border-radius` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 61 | `src/client/theme-default/styles/components/vp-doc.css:310:25` | `border-radius` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 62 | `src/client/theme-default/styles/components/vp-doc.css:329:18` | `border-radius` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 63 | `src/client/theme-default/styles/components/vp-doc.css:330:12` | `padding` | `0.1875rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 64 | `src/client/theme-default/styles/components/vp-doc.css:330:22` | `padding` | `0.375rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 65 | `src/client/theme-default/styles/components/vp-doc.css:351:14` | `font-size` | `0.9em` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 66 | `src/client/theme-default/styles/components/vp-doc.css:360:11` | `margin` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 67 | `src/client/theme-default/styles/components/vp-doc.css:360:16` | `margin` | `-1.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 68 | `src/client/theme-default/styles/components/vp-doc.css:369:20` | `border-radius` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 69 | `src/client/theme-default/styles/components/vp-doc.css:370:13` | `margin` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 70 | `src/client/theme-default/styles/components/vp-doc.css:377:32` | `border-start-start-radius` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 71 | `src/client/theme-default/styles/components/vp-doc.css:378:30` | `border-end-start-radius` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 72 | `src/client/theme-default/styles/components/vp-doc.css:385:15` | `margin-top` | `-0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 73 | `src/client/theme-default/styles/components/vp-doc.css:399:12` | `padding` | `1.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 74 | `src/client/theme-default/styles/components/vp-doc.css:407:14` | `padding` | `1.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 75 | `src/client/theme-default/styles/components/vp-doc.css:419:13` | `margin` | `-1.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 76 | `src/client/theme-default/styles/components/vp-doc.css:420:14` | `padding` | `1.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 77 | `src/client/theme-default/styles/components/vp-doc.css:435:13` | `margin` | `-1.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 78 | `src/client/theme-default/styles/components/vp-doc.css:436:14` | `padding` | `1.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 79 | `src/client/theme-default/styles/components/vp-doc.css:443:23` | `inset-inline-start` | `0.625rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 80 | `src/client/theme-default/styles/components/vp-doc.css:487:25` | `padding-inline-start` | `2rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 81 | `src/client/theme-default/styles/components/vp-doc.css:497:16` | `padding-top` | `1.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 82 | `src/client/theme-default/styles/components/vp-doc.css:511:8` | `top` | `0.75rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 83 | `src/client/theme-default/styles/components/vp-doc.css:512:21` | `inset-inline-end` | `0.75rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 84 | `src/client/theme-default/styles/components/vp-doc.css:515:18` | `border-radius` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 85 | `src/client/theme-default/styles/components/vp-doc.css:553:8` | `top` | `-1px` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 86 | `src/client/theme-default/styles/components/vp-doc.css:560:30` | `border-start-start-radius` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 87 | `src/client/theme-default/styles/components/vp-doc.css:561:28` | `border-end-start-radius` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 88 | `src/client/theme-default/styles/components/vp-doc.css:562:14` | `padding` | `0.625rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 89 | `src/client/theme-default/styles/components/vp-doc.css:566:14` | `font-size` | `0.75rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 90 | `src/client/theme-default/styles/components/vp-doc.css:578:8` | `top` | `0.125rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 91 | `src/client/theme-default/styles/components/vp-doc.css:579:21` | `inset-inline-end` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 92 | `src/client/theme-default/styles/components/vp-doc.css:581:14` | `font-size` | `0.75rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 93 | `src/client/theme-default/styles/components/vp-doc.css:605:24` | `margin-inline-start` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 94 | `src/client/theme-default/styles/components/vp-doc.css:606:25` | `padding-inline-start` | `0.6875rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 95 | `src/client/theme-default/styles/components/vp-sponsor.css:2:18` | `border-radius` | `1rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 96 | `src/client/theme-default/styles/components/vp-sponsor.css:7:18` | `border-radius` | `0.75rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 97 | `src/client/theme-default/styles/components/vp-sponsor.css:11:15` | `margin-top` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 98 | `src/client/theme-default/styles/components/vp-sponsor.css:15:15` | `margin` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 99 | `src/client/theme-default/styles/components/vp-sponsor.css:26:12` | `padding` | `0.8125rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 100 | `src/client/theme-default/styles/components/vp-sponsor.css:26:24` | `padding` | `0.6875rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 101 | `src/client/theme-default/styles/components/vp-sponsor.css:27:14` | `font-size` | `0.875rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 102 | `src/client/theme-default/styles/components/vp-sponsor.css:31:12` | `padding` | `0.5625rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 103 | `src/client/theme-default/styles/components/vp-sponsor.css:31:24` | `padding` | `0.4375rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 104 | `src/client/theme-default/styles/components/vp-sponsor.css:32:14` | `font-size` | `0.75rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 105 | `src/client/theme-default/styles/components/vp-sponsor.css:36:15` | `margin-top` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 106 | `src/client/theme-default/styles/components/vp-sponsor.css:42:8` | `gap` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 107 | `src/client/theme-default/styles/docsearch.css:62:18` | `padding-block` | `0.5rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 108 | `src/client/theme-default/styles/docsearch.css:63:19` | `padding-inline` | `0.625rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 109 | `src/client/theme-default/styles/docsearch.css:63:28` | `padding-inline` | `0.75rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 110 | `src/client/theme-default/styles/docsearch.css:73:14` | `font-size` | `0.75rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 111 | `src/client/theme-default/styles/docsearch.css:77:23` | `padding-inline-end` | `0.375rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 112 | `src/client/theme-default/styles/docsearch.css:81:12` | `padding` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 113 | `src/client/theme-default/styles/docsearch.css:83:18` | `border-radius` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 114 | `src/client/theme-default/styles/docsearch.css:95:12` | `padding` | `0.2em` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 115 | `src/client/theme-default/styles/docsearch.css:95:18` | `padding` | `0.4em` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 116 | `src/client/theme-default/styles/docsearch.css:99:15` | `margin-top` | `-0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 117 | `src/client/theme-default/styles/docsearch.css:100:12` | `padding` | `0.375rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 118 | `src/client/theme-default/styles/docsearch.css:102:18` | `border-radius` | `0.375rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 119 | `src/client/theme-default/styles/docsearch.css:107:18` | `border-radius` | `0.25rem` | TP, low value | VitePress has no tokens for this category. See decision D2. |
| 120 | `src/client/theme-default/styles/fonts.css:14:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 121 | `src/client/theme-default/styles/fonts.css:23:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 122 | `src/client/theme-default/styles/fonts.css:32:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 123 | `src/client/theme-default/styles/fonts.css:41:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 124 | `src/client/theme-default/styles/fonts.css:50:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 125 | `src/client/theme-default/styles/fonts.css:59:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 126 | `src/client/theme-default/styles/fonts.css:68:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 127 | `src/client/theme-default/styles/fonts.css:77:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 128 | `src/client/theme-default/styles/fonts.css:86:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 129 | `src/client/theme-default/styles/fonts.css:95:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 130 | `src/client/theme-default/styles/fonts.css:104:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 131 | `src/client/theme-default/styles/fonts.css:113:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 132 | `src/client/theme-default/styles/fonts.css:122:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 133 | `src/client/theme-default/styles/fonts.css:131:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 134 | `src/client/theme-default/styles/fonts.css:140:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 135 | `src/client/theme-default/styles/fonts.css:149:16` | `font-family` | `Inter` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 136 | `src/client/theme-default/styles/fonts.css:158:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 137 | `src/client/theme-default/styles/fonts.css:167:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 138 | `src/client/theme-default/styles/fonts.css:176:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 139 | `src/client/theme-default/styles/fonts.css:185:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 140 | `src/client/theme-default/styles/fonts.css:194:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 141 | `src/client/theme-default/styles/fonts.css:203:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 142 | `src/client/theme-default/styles/fonts.css:212:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 143 | `src/client/theme-default/styles/fonts.css:221:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 144 | `src/client/theme-default/styles/fonts.css:230:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 145 | `src/client/theme-default/styles/fonts.css:239:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 146 | `src/client/theme-default/styles/fonts.css:248:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 147 | `src/client/theme-default/styles/fonts.css:257:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 148 | `src/client/theme-default/styles/fonts.css:266:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 149 | `src/client/theme-default/styles/fonts.css:275:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 150 | `src/client/theme-default/styles/fonts.css:284:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 151 | `src/client/theme-default/styles/fonts.css:293:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 152 | `src/client/theme-default/styles/fonts.css:302:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
| 153 | `src/client/theme-default/styles/fonts.css:310:16` | `font-family` | `'Inter Core'` | FP, fixed | Inside `@font-face`: a font definition, not a usage. Now skipped. |
