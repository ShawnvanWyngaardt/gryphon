# 0004. How we scan source files

- Status: Proposed
- Date: 2026-11-15
- Deciders: Shawn (product owner), Claude Code (engineer)

## Context

v1 scans CSS, SCSS, Vue single-file components and Tailwind classes (FR2). For every hard-coded value we need the exact line and column (AC3.4). We must not report values inside comments or strings by mistake. The same code must run in the browser. We must never execute project files (NFR-S4). And 1,000 files must scan in under 10 seconds (NFR-P1).

## Options considered

1. **Regular expressions over raw text.** No dependencies and fast. But they break on comments, multi-line declarations, nested SCSS and quoted strings. False positives would make people turn the tool off.
2. **Build on Stylelint as a plugin.** Gives CSS, SCSS and Vue support for free. But it brings a large dependency tree, needs its own config file (we promised DESIGN.md is the only config), and does not cover Tailwind classes in templates.
3. **Small real parsers per file type, our own rules (chosen).**

## Decision

| Input | Tool | Why |
| --- | --- | --- |
| CSS | `postcss` | The standard CSS parser. Gives line and column for each declaration. Works in the browser. 3 small dependencies. |
| SCSS | `postcss-scss` | A PostCSS syntax for SCSS. No dependencies of its own. |
| CSS values | `postcss-value-parser` | Splits values like `8px 13px` or `1px solid #fff` into parts with offsets, so each part gets its own column. No dependencies. |
| Vue SFC | `@vue/compiler-dom` (parse only) | Vue's own template parser. Gives positions for `<style>` blocks and for `class` and `style` attributes. We use it only to parse, never to compile or run code. |
| Tailwind classes | Our own code | A class tokenizer (variants, `!`, `-`, `/50`, `[arbitrary]`) plus a static table of Tailwind v4 default theme values, copied with attribution (MIT). We do not depend on the `tailwindcss` package, which is large and includes a native engine. A project's own `@theme` block is read with PostCSS. |

Structure:

- **Scanners find values. They know nothing about tokens.** Each scanner turns a file into a list of occurrences: the value, its category (colour, font family, font size, spacing, radius), the property, and its position.
- **A separate matcher (ADR 0005) compares occurrences with the token set.** This keeps scanners simple to test and lets the CLI, the Action and the playground share everything.
- **Positions are always 1-based line and column of the value itself**, not of the whole declaration.
- **Files that fail to parse are skipped and reported (AC2.8).** One broken file never stops the run.

## What we give up

- Four runtime dependencies (`postcss`, `postcss-scss`, `postcss-value-parser`, `@vue/compiler-dom`) instead of none. Each one is justified in the PR that adds it.
- **Risk: `@vue/compiler-dom` may be too heavy for the playground.** Its parent package depends on `@babel/parser`, which is large. I expect the browser build to leave Babel out [Guessing: not measured]. G4-01 measures it first. If it is too heavy, the fallback is a small block splitter of our own for the playground only.
- We keep our own copy of Tailwind's default theme values, which must be refreshed when Tailwind changes them.
- Dynamic Vue classes (`:class` with computed expressions) cannot be checked. We check string and array literals only, and say so in the docs.
