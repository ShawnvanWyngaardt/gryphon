---
version: alpha
name: Proof Sheet
description: Design system for the James the Gryphon playground and docs site. A printer's proof with heraldic colours, built for reading code and findings.
colors:
  primary: "#1B1A17"
  secondary: "#58534A"
  tertiary: "#1F5C45"
  neutral: "#F6F3EC"
  surface: "#FFFDF8"
  on-surface: "#1B1A17"
  on-tertiary: "#F6F3EC"
  tertiary-hover: "#174735"
  tertiary-tint: "#E2EEE7"
  rule: "#D6CFC2"
  rule-strong: "#8C8578"
  error: "#A8231B"
  error-tint: "#F7E4E1"
  warning: "#7A5200"
  warning-tint: "#F6EBD3"
  dark-neutral: "#16150F"
  dark-surface: "#201F19"
  dark-on-surface: "#EEE9DD"
  dark-secondary: "#ABA496"
  dark-rule: "#3A372F"
  dark-tertiary: "#6FC2A0"
  dark-error: "#F08A80"
  dark-warning: "#E2B656"
typography:
  headline-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
  headline-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.3
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 14px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.08em
  code-md:
    fontFamily: Atkinson Hyperlegible Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  code-sm:
    fontFamily: Atkinson Hyperlegible Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
rounded:
  none: 0px
  sm: 2px
  md: 4px
spacing:
  xxs: 2px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 64px
  gutter: 24px
  measure: 720px
  page-max: 1280px
components:
  page:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  page-dark:
    backgroundColor: "{colors.dark-neutral}"
    textColor: "{colors.dark-on-surface}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.none}"
    padding: "{spacing.md}"
    borderColor: "{colors.rule}"
  panel-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-on-surface}"
    borderColor: "{colors.dark-rule}"
  caption:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    typography: "{typography.body-sm}"
  caption-dark:
    backgroundColor: "{colors.dark-neutral}"
    textColor: "{colors.dark-secondary}"
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: 12px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.tertiary-hover}"
    textColor: "{colors.surface}"
  button-primary-dark:
    backgroundColor: "{colors.dark-tertiary}"
    textColor: "{colors.dark-neutral}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: 12px
    height: 40px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.code-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"
    borderColor: "{colors.rule-strong}"
  finding-error:
    backgroundColor: "{colors.error-tint}"
    textColor: "{colors.error}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
  finding-error-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-error}"
  finding-warning:
    backgroundColor: "{colors.warning-tint}"
    textColor: "{colors.warning}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
  finding-warning-dark:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.dark-warning}"
  finding-pass:
    backgroundColor: "{colors.tertiary-tint}"
    textColor: "{colors.tertiary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.none}"
    padding: "{spacing.xs}"
  code-block:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.code-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.md}"
  link:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.tertiary}"
---

# Proof Sheet

## Overview

James the Gryphon is a proofreader for design. It reads a DESIGN.md, reads your UI code, and marks the places where the code drifts. The playground and docs should feel like a printer's proof on a desk: warm paper, black ink, ruled lines, and a few correction marks in the margin.

The audience is frontend developers and designers. They come to read findings and code, not to admire the tool. So the interface is quiet, dense where it needs to be, and calm. Colour is rare and always means something.

The palette borrows from heraldry, because a gryphon is a heraldic beast. Sable (ink black), argent (paper), vert (green) for actions, gules (red) for errors, and or (ochre) for warnings. This keeps us away from the common AI defaults: no indigo or violet, no lavender washes, no gradients.

Personality: precise, plain, a little bookish. Never cute, never loud.

## Colors

- **Primary, Sable (#1B1A17):** Ink. Headlines, body text, icons. A warm near-black, not pure black.
- **Secondary (#58534A):** Faded ink. Captions, metadata, line numbers, helper text. Passes AA on paper (6.9:1).
- **Tertiary, Vert (#1F5C45):** The only action colour. Primary buttons, links, focus state accents, the "pass" mark. Hover darkens to #174735.
- **Neutral, Argent (#F6F3EC):** Paper. The page background. Warm, slightly cream, never lavender or blue-grey.
- **Surface (#FFFDF8):** A clean sheet laid on the paper. Editors, code blocks, panels.
- **Rule (#D6CFC2) and Rule Strong (#8C8578):** Ruled lines. Rule is for dividers. Rule Strong is for input borders, where 3:1 contrast is required.
- **Error, Gules (#A8231B):** Correction red. Only for error findings and error messages. Its tint (#F7E4E1) backs error badges and highlighted lines.
- **Warning, Or (#7A5200):** A dark ochre, so it passes AA as text. Only for warnings. Its tint (#F6EBD3) backs warning badges.

Dark mode uses the `dark-*` tokens. Paper becomes a warm charcoal (#16150F), ink becomes bone (#EEE9DD), and the heraldic colours are lifted so they keep at least 4.5:1 on dark surfaces.

Colour never carries meaning alone. Every finding also has a text label (ERROR, WARNING, PASS) and an icon shape.

## Typography

One superfamily, chosen for legibility: **Atkinson Hyperlegible Next** for interface and prose, **Atkinson Hyperlegible Mono** for code. They were designed by the Braille Institute for low-vision readers. Distinct letterforms (I, l, 1 and O, 0) matter a lot in a tool that shows hex values and line numbers.

- **Headlines (headline-lg, -md, -sm):** Bold, tight line height, used sparingly. One headline-lg per page at most.
- **Body (body-lg, -md, -sm):** Regular at 16px by default. body-lg for docs prose, body-sm for dense report rows.
- **Labels (label-md, label-caps):** Bold. label-caps is for severity badges and section eyebrows, uppercase with generous tracking.
- **Code (code-md, code-sm):** All code, file paths, token names and values. Never set code in the sans.

Fonts are self-hosted. The site makes no requests to font CDNs, because the product promises that nothing leaves the browser.

Prose lines stay under 72 characters (the `measure` spacing token, 720px).

## Layout

A 4px base grid. Most gaps use 8, 16 and 24.

- **Playground:** three columns on wide screens: DESIGN.md input, code input, report. Below 1024px the columns stack, with the report first after a run. Columns are separated by a 1px rule, not by gaps and cards.
- **Docs:** a single reading column capped at the `measure` width, with a left table of contents on wide screens.
- **Page width:** content caps at 1280px (`page-max`), with a 24px gutter.
- Density is a feature. Report rows are compact (8px vertical padding) so a reviewer can scan 50 findings without scrolling forever.

## Elevation & Depth

Flat. There are no drop shadows anywhere.

Hierarchy comes from three things only: the surface sheet on the paper background, 1px ruled lines, and type weight. A modal, if one is ever needed, gets a 1px Rule Strong border and a paper-coloured scrim, not a shadow.

## Shapes

Architectural and mostly square, like a printed form.

- Panels, inputs, code blocks and badges: 0px radius.
- Buttons: 2px radius, just enough to read as pressable.
- The 4px radius is the maximum. Nothing is pill-shaped. Nothing is a circle except icons that are circles by nature.

## Components

- **Buttons:** Primary is vert with paper text, one per view (usually "Check"). Secondary is surface with ink text and a 1px Rule Strong border. Height 40px, which with surrounding spacing gives at least a 44px target. Focus: 2px ink outline with 2px offset, always visible.
- **Inputs and editors:** Surface background, 1px Rule Strong border, square corners, code-md type. Line numbers in secondary colour. Focus thickens the border to 2px ink.
- **Finding row:** severity badge (label-caps on tint), then file and line in code-sm, then the message in body-sm, then the suggested fix in code-sm on a surface block. Errors and warnings use the same shape, only the badge changes.
- **Severity badges:** Square, label-caps, tint background, coloured text, plus an icon: a cross for error, a triangle for warning, a tick for pass.
- **Code block:** Surface, square, 16px padding, horizontal scroll inside the block, never on the page.
- **Links:** Vert, underlined by default. Underline is never removed.
- **Dividers:** 1px Rule.

## Do's and Don'ts

- Do use vert for the single most important action per view.
- Do pair every colour signal with a text label and an icon.
- Do set all code, paths, token names and values in the mono face.
- Do keep text contrast at 4.5:1 or more, and UI borders at 3:1 or more, in both themes.
- Do self-host fonts and assets. No third-party requests.
- Don't use gradients of any kind, and never indigo, violet or lavender.
- Don't add drop shadows or glow effects.
- Don't put every block in a rounded card. Use rules and whitespace.
- Don't use red or ochre for decoration. They mean error and warning only.
- Don't use emoji as icons.
- Don't centre long text. Left-align everything except single-line empty states.
