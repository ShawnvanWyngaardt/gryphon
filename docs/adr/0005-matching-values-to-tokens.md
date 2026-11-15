# 0005. Matching values to tokens

- Status: Accepted
- Date: 2026-11-15
- Deciders: Shawn (product owner), Claude Code (engineer)

## Context

For each hard-coded value we must decide three things (FR3):

1. Does it equal a token exactly? That gives `raw-token-value`, a warning (approved in Gate 1).
2. If not, it is `off-token`, an error.
3. Either way, which token is nearest, so we can suggest a fix?

"Nearest" must be testable (AC3.1, AC3.2). It must also feel right to a designer: two colours that look alike should be close.

## Options considered

**Colour distance**

1. **Distance in RGB.** Easy, but it does not match how people see colour. Two blues can be far apart in RGB yet look almost the same.
2. **CIEDE2000.** The industry standard for "noticeable difference", but the formula is long and hard to explain or check.
3. **Distance in OKLab (chosen).** OKLab is a colour space designed so that equal distances look like equal differences. The distance is plain geometry on three numbers. CSS Color 4 uses it too.

**Colour parsing:** our own code versus `culori` (chosen). DESIGN.md allows hex, named colours, `rgb`, `hsl`, `hwb`, `lab`, `lch`, `oklab` and `oklch`. Hand-written conversions are exactly where subtle bugs hide. `culori` has no dependencies, an MIT licence, and lets us import only the parts we use.

## Decision

- **Exact match, colours:** both values convert to the same 8-bit sRGB colour and alpha. So `#fff`, `white` and `rgb(255 255 255)` all equal a `#FFFFFF` token.
- **Exact match, sizes:** the same number of px after converting `rem` and `em` with the root size (default 16px, configurable).
- **Nearest colour:** the smallest OKLab distance among colour tokens. Below 0.02 we call it "looks the same"; above 0.1 we say "no close token, consider adding one to DESIGN.md".
- **Nearest size:** the smallest px difference, only among tokens of the same kind: spacing against `spacing`, radius against `rounded`, font size against all `typography.*.fontSize` values.
- **Font families:** no distance. We compare names case-insensitively without quotes, allow generic fallbacks (`sans-serif`), and suggest the families DESIGN.md defines.
- **Ties** go to the token defined first in DESIGN.md, so results never change between runs.
- **Multi-part values** (`padding: 8px 13px`) are checked part by part, each with its own column.
- **Negative spacing** (`margin: -8px`) is matched on its absolute value, and the fix keeps the sign.
- **`color-mix()` in tokens** is resolved when all its inputs are plain colours (in `srgb` or `oklab`). Otherwise that token is skipped with a notice.

## What we give up

- One more runtime dependency (`culori`).
- OKLab distance is slightly less precise than CIEDE2000 for some colour pairs. For "which of your 20 tokens is closest" that difference does not change the answer in practice [Likely: not tested on real palettes yet. G3-08 will include such tests].
- The 0.02 and 0.1 thresholds are starting points, not research results. We tune them during dogfooding (G3-11).
- Partly transparent colours are matched on colour first. The suggestion mentions the opacity, but we do not search for the best mix of token and opacity.
