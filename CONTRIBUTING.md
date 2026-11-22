# Contributing to James the Gryphon

Thank you for helping. This project checks UI code against a DESIGN.md, so it tries hard to be predictable, private and easy to review. This file says how to work on it.

## Set up

You need Node 22.13 or newer (`.nvmrc` says 24) and git.

```bash
npm ci
```

```bash
npm run build
```

```bash
npm run gryphon -- check
```

Do not use `npx gryphon`: before our package is published, it downloads an unrelated npm package with that name.

| Command | What it does |
| --- | --- |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier check (`npm run format` to fix) |
| `npm run typecheck` | TypeScript strict type check |
| `npm test` | Vitest, once |
| `npm run test:coverage` | Vitest with the coverage floors |
| `npm run build` | Compile the package to `packages/gryphon-designmd/dist` |
| `npm run gryphon -- <args>` | Run the built CLI from the repo root |
| `npm run bench` | Time the CLI on 1,000 generated files (build first) |

## How the code is laid out

`docs/claude/architecture.md` has the module map and the pipeline. The one rule that shapes everything: **`packages/gryphon-designmd/src/core` must run in the browser.** It never imports Node modules or uses `process`, `Buffer` or `require`, and ESLint fails if it does. The CLI in `src/cli` reads files and passes text in. That is how the CLI, the GitHub Action and the playground give the same findings.

The reasons behind each choice are in `docs/adr/`.

## Making a change

1. **Pick a ticket** from `docs/BACKLOG.md`, in order. One ticket per pull request.
2. **Branch** from an up-to-date `main`: `claude/<ticket-id>-<short-name>`, for example `claude/g4-03-ignore-comments`. Contributors who are not the agent may use any clear branch name.
3. **Write the failing test first** for the parser, the scanners, the value normalisers and the matcher. Then write the code.
4. **Keep it small:** aim for under 300 changed lines. Size bands count code only (S under 100 lines, M 100 to 300, L over 300); tests roughly double the total.
5. **Commit** with the ticket id first: `G4-03: ignore comments and suppression counts`.
6. **Open a pull request** with these sections, in plain language:
   - **What:** the change, and the ticket and requirement ids (FR, NFR, AC in `docs/SPEC.md`).
   - **Why:** the reason for the approach.
   - **Trade-offs rejected:** the other options and why not.
   - **New dependencies:** each one justified, or "none".
   - **Decisions for the reviewer:** anything you are unsure about.
   - **Size:** changed lines, and how many are tests.

## Tests and checks

- Tests sit next to the code: `foo.ts` and `foo.test.ts`.
- Tests in `src/core` cannot use `fs` either. Load fixtures with a `?raw` import.
- Coverage floors are 80% for lines, branches, functions and statements on `core/parser`, `core/scanner`, `core/values` and `core/matcher`. **Never lower them.**
- When you check line and column positions, compute the expected values with a script from the fixture text. Hand counting has been wrong several times in this project.
- Make sure a new test can fail. If it passes before your change, it is not testing your change.
- CI runs on every pull request: lint, format, type check, the runtime dependency audit, build, a self-check of this repo, the benchmark, tests on Node 22, 24 and 26, and tests on Windows. All checks must be green before merging.
- **Never skip, weaken or delete a test or a check to make a pull request green.** If a check fails for a reason outside your change, explain it in the pull request and ask.

## Public contracts

These are public API. Changing them is never a `minor` change and always needs a review:

- the JSON report (`Report` in `core/types.ts` and `packages/gryphon-designmd/schema/report-v1.schema.json`);
- the CLI options, exit codes and help text;
- the `gryphon.config.json` fields;
- the ignore comment syntax;
- the exports of `core/index.ts`.

### When to bump `schemaVersion`

The JSON report carries `schemaVersion`. Tools that read our reports rely on it, so the rule is strict.

- **Before the first npm release** (Gate 5), version 1 may still change in place. It did once, when `approximate` was added in G3-08.
- **From the first release on, any change to the report needs a new `schemaVersion`**, even adding an optional field. The v1 schema rejects unknown fields (`additionalProperties: false`), so a new field would break anyone who validates against v1.
- A new version gets a new schema file (`report-v2.schema.json`). The old file stays published, so existing users keep working.
- The pull request says what changed, why, and how a reader of v1 should move to the new version.

## Dependencies

- **Prefer none.** Every new dependency, runtime or dev, needs a justification in its pull request. Runtime dependencies end up in every user's install and in the browser playground.
- **Pin exact versions.** `npm install --save-exact`.
- **Wait a week.** Do not add or upgrade to a release that is less than 7 days old. Compromised releases are usually found and pulled within days. Dependabot follows the same rule.
- **Audits:** every pull request fails on a high or critical advisory in a runtime dependency. A weekly job audits dev tools too. Accepted dev-only advisories are listed in `docs/SPEC.md` section 8.2.

## Privacy and security

- **No telemetry, ever.** No analytics, crash reports or update checks.
- **No user code leaves the user's machine or browser.**
- **Never execute project files.** The config file is plain JSON. We read files as text and never run a project's JavaScript or config.
- If you find a security problem, do not open a public issue. Contact the maintainer privately through GitHub.

## Writing style

- English, short sentences, plain words.
- **No em dashes anywhere:** code comments, docs, pull request text or UI copy.

## Gates

The project moves through five gates: spec, architecture, first working slice, release candidate and launch. At each gate a pull request summarises the work, and nothing of the next gate starts until the product owner approves. Details are in `docs/claude/workflow.md`.
