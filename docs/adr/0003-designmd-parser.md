# 0003. DESIGN.md parser

- Status: Proposed
- Date: 2026-11-15
- Deciders: Shawn (product owner), Claude Code (engineer)
- Related: SPEC section 9, decision A (approved in Gate 1)

## Context

FR1 needs a parser that turns a DESIGN.md into a token set, with line numbers (AC1.8), resolved references (AC1.2) and colours and sizes in a form we can compare. It runs in the CLI and in the playground (bundle budget 150 KB). The format is alpha and will change.

Gate 1 approved the direction: our own parser, checked against Google's in CI. This ADR records how.

## Options considered

1. **Reuse `@google/design.md/linter` at runtime.** Always matches the spec, but brings 9 direct dependencies (the unified and remark family, zod, citty and others) into the CLI and the playground.
2. **Our own parser with `js-yaml`.** Popular, but it cannot tell us the line of each YAML key, and it pulls in `argparse`.
3. **Our own parser with `yaml` (chosen).** Zero dependencies, ISC licence. It keeps source positions for every key, so we get line and column for each token without extra work.

## Decision

- **Front matter:** read the block between the first two `---` lines with `yaml`, and use its position data for line and column.
- **Body:** split on `##` headings outside fenced code blocks. We do not parse the Markdown further, because we only enforce tokens. Duplicate sections are an error (spec rule).
- **Output:** one `TokenSet` type. It is the only thing other modules see. Nothing outside the parser touches YAML. If we ever switch to Google's parser (SPEC section 8.1), only this module changes.
- **Comparison test (G3-06):** `@google/design.md` is a dev dependency, pinned. A CI test feeds the same files (Google's examples and our DESIGN.md) to Google's library API and to our parser, and compares the tokens. It fails on any difference.
- **First step of G3-06:** find out why `design.md lint` printed nothing and exited 0 on our DESIGN.md (Shawn ran it on 15 November). The README says it always prints JSON with a summary. Until we understand that, we compare against the library's parsed result (`lint(text).designSystem`), not against CLI output.

## What we give up

- When the spec changes, we update our parser by hand. The comparison test tells us when, but someone still has to do the work.
- We only recognise `##` headings, not the rarer underlined (setext) style. The spec says sections use `##`, so we follow the spec text.
- We trust Google's library as the reference, and we have already seen one unexplained result from its CLI. If the library also behaves oddly, the comparison test loses value, and we fall back to golden-file tests based on the spec text.
