# James the Gryphon

James the Gryphon checks whether your UI code still follows your DESIGN.md. It reads the design tokens in your project's [DESIGN.md](https://github.com/google-labs-code/design.md) and scans your Vue, React, CSS, SCSS and Tailwind code for colours, fonts, font sizes, spacing and corner radii that are not in those tokens. For each one it tells you the file, the line, the nearest token and how to fix it. It also flags a few common "AI-made UI" tells. It will run as a CLI, as a GitHub Action that reports only the drift a pull request adds, and as a browser playground where nothing you paste ever leaves your machine. The project is in its spec phase: see [docs/SPEC.md](docs/SPEC.md).

Built by Claude Code. Directed and reviewed by Shawn.
