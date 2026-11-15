# 0006. Hosting, CSP and release pipeline

- Status: Proposed
- Date: 2026-11-15
- Deciders: Shawn (product owner), Claude Code (engineer)
- Related: SPEC section 9, decisions B and C (approved in Gate 1)

## Context

We publish three things: the playground (a static site), the npm package `gryphon-designmd`, and the GitHub Action. All must cost EUR 0 (NFR-C1). The playground must provably send nothing anywhere (AC7.2). Releases must be traceable to source (NFR-S5). Gate 1 approved GitHub Pages and the npm name. This ADR records how we use them.

## Options considered

**npm publishing**

1. **Publish from a laptop with `npm publish`.** Simple, but nobody can check that the package matches the code.
2. **Publish from GitHub Actions with a stored npm token.** Traceable, but a long-lived secret that can leak.
3. **Publish from GitHub Actions with npm Trusted Publishing (chosen).** GitHub proves its identity to npm for each run, so we store no npm token, and npm records provenance (which commit built the package).

**GitHub Action packaging**

1. **Composite Action that runs `npx gryphon-designmd`.** One artifact, but every run downloads from npm, and posting the PR comment would push GitHub-specific code into the CLI.
2. **JavaScript Action bundled into one file (chosen).** esbuild bundles `src/action` into `action/dist/index.js`, committed to the repo, because GitHub runs Actions straight from the repo. It runs on GitHub's `node24` runtime.

## Decision

**Playground hosting**

- Built by Vite and deployed to GitHub Pages by GitHub's official Pages Actions, from `main`. First deploy in G5-01.
- The CSP is set in a `<meta>` tag: `default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'`. Plus `<meta name="referrer" content="no-referrer">`.
- No `unsafe-eval`. The playground uses Vue's runtime-only build with precompiled templates.

**npm**

- Package `gryphon-designmd`, command `gryphon`. No placeholder publish before Gate 5 (approved).
- Released from a version tag by a GitHub Actions workflow with Trusted Publishing and provenance.

**Action**

- No `@actions/*` libraries. Inputs come from environment variables. The job summary and annotations use GitHub's documented files and workflow commands. The PR comment uses `fetch` against the GitHub REST API with the job's token.
- CI fails if `action/dist/index.js` does not match a fresh build, so the committed file cannot drift from the source.
- Tags: an exact tag for each release (`v1.2.3`) and a moving major tag (`v1`). The docs tell users to pin by commit SHA.

**Versions:** semver, bumped by hand in a release PR. No release tooling for v1.

## What we give up

- **No `frame-ancestors`.** GitHub Pages cannot set custom headers, so another site could show the playground inside a frame. The playground has no login and no actions worth tricking someone into, so the risk is low.
- **The first npm publish may need a short-lived token.** npm may require the package to exist before Trusted Publishing can be set up [Guessing: check in G4-19]. If so, we use a one-time token and delete it straight after.
- **Built code is committed** (`action/dist`). That adds noise to diffs. We mark it as generated so GitHub collapses it.
- **Writing our own small Action helpers** instead of using `@actions/*` means a little more code, in exchange for no dependencies in the Action.
- **Manual version bumps** are easy to forget. With releases this rare, that is acceptable.
