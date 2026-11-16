# Draft issue for google-labs-code/design.md

Status: draft. Shawn posts it himself, when he decides to.
Written: 16 November 2026, from the G3-06 comparison (PR 9).

How to use this file: copy everything below the line into a new issue at
https://github.com/google-labs-code/design.md/issues. Section B is optional:
include it only if the CLI name clash is confirmed on Windows, otherwise
delete it.

Before posting: search the repo's issues for "typography reference" and
"lineHeight" in case someone has already reported this.

---

**Title:** Typography properties do not resolve token references, and unitless `lineHeight` is dropped

## Summary

In `@google/design.md` 0.4.0, a token reference inside a typography level is
not resolved. Depending on the property, the value is dropped without a
finding, kept as literal text, or reported as an error. References in
`components` resolve correctly, so the behaviour is inconsistent.

The spec says a reference "must point to a primitive value" for most token
groups, which `{typography.base.fontSize}` and `{spacing.md}` do. So I expected
them to resolve.

## Environment

- `@google/design.md` 0.4.0
- Node 22.23.4
- Called through the library: `import { lint } from '@google/design.md/linter'`

## Reproduction

```ts
import { lint } from '@google/design.md/linter';

const report = lint(`---
name: Repro
colors:
  primary: "#1A1C1E"
spacing:
  md: 16px
typography:
  base:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.01em
  body:
    fontFamily: "{typography.base.fontFamily}"
    fontSize: "{spacing.md}"
    fontWeight: "{typography.base.fontWeight}"
    lineHeight: "{typography.base.lineHeight}"
    letterSpacing: "{typography.base.letterSpacing}"
components:
  card:
    backgroundColor: "{colors.primary}"
---
`);

console.log(report.designSystem.typography.get('body'));
console.log(report.designSystem.typography.get('base'));
console.log(report.findings);
```

## What happens

`typography.body`:

```json
{ "type": "typography", "fontFamily": "{typography.base.fontFamily}" }
```

`typography.base`:

```json
{
  "type": "typography",
  "fontFamily": "Public Sans",
  "fontWeight": 400,
  "fontSize": { "type": "dimension", "value": 16, "unit": "px" },
  "letterSpacing": { "type": "dimension", "value": 0.01, "unit": "em" }
}
```

Findings (besides the two `info` findings):

```
error  typography.body.fontWeight  '{typography.base.fontWeight}' is not a valid font weight. Expected a number.
```

| Property in `typography.body` | Result |
| --- | --- |
| `fontFamily: "{typography.base.fontFamily}"` | Kept as the literal string `{typography.base.fontFamily}`. An export would use that as a font name. |
| `fontSize: "{spacing.md}"` | Dropped. No finding. |
| `lineHeight: "{typography.base.lineHeight}"` | Dropped. No finding. |
| `letterSpacing: "{typography.base.letterSpacing}"` | Dropped. No finding. |
| `fontWeight: "{typography.base.fontWeight}"` | Error: "not a valid font weight". |

Separately, in `typography.base`, `lineHeight: 1.5` is missing, with no finding.
The spec allows a unitless number for `lineHeight` ("Accepts either a Dimension
... or a unitless number (e.g., 1.6)").

For comparison, `components.card.backgroundColor: "{colors.primary}"` resolves
correctly to `#1a1c1e`.

## Expected

1. References in typography properties resolve to the referenced value, as they
   do in `components`.
2. If a typography reference is not allowed, the linter reports it, instead of
   dropping it or keeping it as literal text.
3. A unitless `lineHeight` is kept, as the spec describes.

## Why it matters

Agents and exports read `designSystem`. A silently dropped `fontSize` means an
agent falls back to its own default size, which is exactly the drift DESIGN.md
is meant to prevent. A literal `{typography.base.fontFamily}` font name would
end up in generated CSS.

---

## B. Optional: the `design.md` command name on Windows

Include this section only if it is confirmed.

`npx -y @google/design.md@0.4.0 lint DESIGN.md`, run in a folder that contains
`DESIGN.md`, printed nothing and exited with code 0.

The CLI's `lint` command always prints JSON, so it never ran. The command is
named `design.md`. On Windows, `cmd.exe` searches the current folder before
`PATH`, finds `DESIGN.md` (file names are not case-sensitive), and opens it
with the program registered for `.md` files.

Workaround: the package also ships the command `designmd`:

```
npx -y -p @google/design.md@0.4.0 designmd lint DESIGN.md
```

Suggestion: document `designmd` as the main command, or drop the `design.md`
command name, since it will always collide with the file it is meant to check.
