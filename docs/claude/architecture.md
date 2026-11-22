# Architecture

Read this before changing code in `packages/`. The reasons behind each choice are in `docs/adr/`.

## Layout

```
package.json                  npm workspaces root, all dev tools, scripts
packages/gryphon-designmd/    the one package (npm name gryphon-designmd, CLI name gryphon)
  src/core/                   checking engine, runs in Node and the browser
  src/cli/                    Node-only CLI: args, config, files, output
  schema/report-v1.schema.json  public JSON report schema
  dist/                       build output (git-ignored, from npm run build)
docs/                         SPEC, BACKLOG, STATUS, DOGFOOD, ADRs, drafts
docs/dogfood/                 DESIGN.md files used for dogfood runs
DESIGN.md                     this project's own tokens (playground and docs site)
```

The Action and the playground do not exist yet (Gate 4). ADR 0002 says where they go.

## The one rule that shapes everything

`src/core` must run in the browser, because the CLI, the Action and the playground must give the same findings. So `src/core` never imports Node modules (`node:*`, `fs`, `path` and so on) or uses `process`, `Buffer` or `require`. ESLint fails the build if it does. The CLI reads files and passes text in.

## Pipeline

`src/cli/run.ts` wires it together:

1. `loadConfig` (`cli/config.ts`): read and validate `gryphon.config.json` or `--config`. Plain JSON, never executed.
2. `parseDesignMd` (`core/parser/parse.ts`): YAML front matter to a `TokenSet`, with line and column for each token. Resolves `{colors.primary}` references via `core/parser/references.ts`. Returns success or failure with errors, never throws.
3. `createMatcher` (`core/matcher/match.ts`): builds a function that turns an `Occurrence` into a `Finding`. `ungovernedCategories` lists categories DESIGN.md has no tokens for; those are skipped with one notice each.
4. `findFiles` (`cli/files.ts`): `.css`, `.scss`, `.vue`, following `.gitignore`, then `include` and `exclude` globs (`cli/glob.ts`).
5. `scanCss` or `scanVue` (`core/scanner/`): source text to `Occurrence`s with exact line and column. `scanVue` extracts `<style>` blocks and static `style` attributes and calls `scanCss` with a line and column offset.
6. `buildReport` (`core/report.ts`): sorts findings and counts them.
7. `formatText` (`cli/format.ts`) or JSON output, then the exit code.

## Module map

| File | Role |
| --- | --- |
| `core/index.ts` | Public engine API. Everything the CLI uses comes from here. |
| `core/types.ts` | Shared types: `Category`, `Token`, `TokenSet`, `Occurrence`, `Finding`, `Report`. |
| `core/values/color.ts` | Any DESIGN.md colour (including `oklch()`, `color-mix()`) to 8-bit sRGB and OKLab, via culori. |
| `core/values/dimension.ts` | `px`, `rem`, `em` to px. `em` is treated like `rem` and findings are marked `approximate`. |
| `core/matcher/match.ts` | Exact match gives `raw-token-value` (warning). Otherwise `off-token` (error) with the nearest token: OKLab distance for colours (`SAME_COLOR`, `FAR_COLOR`), px within the same category for sizes. |
| `core/scanner/css.ts` | postcss, postcss-scss and postcss-value-parser. Only the first family of a font stack is checked. Colours in custom properties outside token files are checked. |
| `core/scanner/vue.ts` | Vue SFC scanning. Skips less, stylus and indented sass. |
| `cli/main.ts` | Bin entry point. Calls `run` with real stdio. |
| `cli/run.ts` | Argument parsing, the pipeline above, exit codes. |

## Key concepts

- **Categories:** `color`, `fontFamily`, `fontSize`, `spacing`, `radius`. DESIGN.md has no tokens for shadows, motion, breakpoints, z-index or border width, so we do not check them.
- **Rules:** `off-token` (error) and `raw-token-value` (warning). Config `rules` can change the severity or turn one off.
- **Token sources:** files where tokens are defined are not checked. Without `tokenSources`, any CSS or SCSS file with a `:root` rule defining custom properties counts. With it, only matching files count. See README.
- **Exit codes:** `0` no problems, `1` problems found, `2` the run failed (`EXIT` in `cli/run.ts`).

## Public contracts: changing these is never `minor`

- The JSON report (`Report` in `core/types.ts`, `schema/report-v1.schema.json`). Any change needs a new schema version.
- CLI options, exit codes and the help text.
- `gryphon.config.json` fields.
- Exports of `core/index.ts`.

## Runtime dependencies

`@vue/compiler-dom` (parse only, ADR 0004), `culori`, `postcss`, `postcss-scss`, `postcss-value-parser`, `yaml`. All pinned to exact versions. No native binaries, no browser engine. Adding one needs a justification in the PR and Shawn's review.
