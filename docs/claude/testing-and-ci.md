# Testing and CI

Read this before writing tests, touching CI, coverage or dependencies.

## Tests

- **Tests first** for the parser, the scanners, the value normalisers and the matcher. Write the failing test, then the code. Say so in the PR.
- Vitest. Test files sit next to the code: `foo.ts` and `foo.test.ts`.
- Coverage floors of 80% for lines, branches, functions and statements on `core/parser`, `core/scanner`, `core/values` and `core/matcher` (`vitest.config.ts`). Never lower them.
- Tests in `src/core` cannot use `fs` either. Load fixture files with a `?raw` import, for example `import text from './fixture.css?raw'` (typed in `core/raw-imports.d.ts`).
- `core/parser/compare-google.test.ts` compares our parser with Google's `@google/design.md` (a pinned dev dependency, used only here). It documents one known difference. If it fails after a version bump, report the difference; do not hide it.
- CLI tests call `run(argv, io)` with a fake `Io`, so they need no child process.

## CI (`.github/workflows/ci.yml`)

Runs on every PR and every push to `main`. All checks are required on `main`.

| Job | Runs |
| --- | --- |
| Lint, format, types, audit (Node 24) | lint, format check, type check, `npm audit --omit=dev --audit-level=high`, build, `gryphon --version`, `gryphon check` on this repo |
| Tests and coverage | Node 22, 24 and 26 |
| Tests on Windows (Node 24) | tests, build and self-check, because Shawn runs gryphon on Windows |

`audit.yml` runs the full audit, dev tools included, weekly and on push to `main`. It is not a required check. Accepted dev-only advisories are listed in `docs/SPEC.md` section 8.2.

## Rules for CI and dependencies

- Actions are pinned by commit SHA, with the tag in a comment.
- Dependencies are pinned to exact versions. Dependabot proposes updates for npm and Actions.
- Never skip, weaken or delete a check to make a PR green. If a check fails for a reason outside the PR, explain it in the PR and ask.
- A new dependency, runtime or dev, needs a justification in its PR. Prefer none.
