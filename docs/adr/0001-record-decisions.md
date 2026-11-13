# 0001. Record architecture decisions

- Status: Proposed
- Date: 2026-11-13
- Deciders: Shawn (product owner), Claude Code (engineer)

## Context

This project is built by an AI coding agent and reviewed by a human. The agent works in short sessions and does not remember earlier ones. The human must be able to explain every decision later, for example in a job interview.

So decisions cannot live only in chat history or in someone's head. Without a written record:

- a later session may undo a decision because it does not know why it was made;
- the reviewer cannot tell a deliberate trade-off from an accident;
- nobody can say which options were rejected, or why.

## Decision

We keep Architecture Decision Records (ADRs) in `docs/adr/`, one Markdown file per decision, named `NNNN-short-title.md` with a four-digit number.

We write an ADR when a choice is hard to undo or shapes later work: stack, structure, dependencies, public API, data formats, hosting, security model.

Each ADR has these sections:

1. **Status:** Proposed, Accepted, Rejected, or Superseded by NNNN.
2. **Context:** the problem and the forces at play.
3. **Decision:** what we chose, in plain words.
4. **Options considered:** each option with its pros and cons, including the ones we rejected.
5. **Consequences:** what gets easier, what gets harder, what we must now do.

Rules:

- An ADR arrives in its own PR, or in the PR that needs it. Shawn accepts it by approving the PR.
- Accepted ADRs are not edited, except to fix typos or change the status. To change a decision, write a new ADR that supersedes the old one.
- Every PR that depends on a decision links to its ADR.

## Options considered

- **No records, rely on PR descriptions.** Cheap, but PR text is scattered and hard to find later. Rejected.
- **One long DECISIONS.md file.** Simple, but it grows into a wall of text, and changes to one decision show up as edits to a shared file. Rejected.
- **A wiki or Notion page.** Lives outside the repo, so it drifts from the code and needs extra tools. Rejected.
- **ADRs in the repo (chosen).** Versioned with the code, reviewed in the same PRs, easy for both humans and agents to read.

## Consequences

- Each significant decision takes about 15 minutes more to write down.
- New sessions of the agent can read `docs/adr/` to catch up quickly.
- Shawn has a ready-made, honest story of the project's trade-offs for the case study.
