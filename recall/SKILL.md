---
name: recall
description: Rebuild working context from Claude Code, Codex, and T3 history plus current repo state. Use when resuming prior work, finding related sessions, or asking where a project or feature stands.
---

# Recall

Reconstruct what the user wanted, what was decided, what actually shipped, and what remains. Give the next agent or the user a short brief they can act on.

## Scope first

- A named thread or session takes priority. Read it and follow related chats only when they contain needed context.
- Otherwise use the named topic and workspace, with the last seven days as the default for "recent". State that scope briefly and proceed. Respect an explicit range or request for all history; disclose any incomplete coverage.
- Search another project's history only when the user asks or names it. A thread from the same repo in another worktree is relevant; confirm its repo identity before including it.
- If the user supplied a complete state brief, verify it against current state instead of repeating the history search.

## Reconstruct the record

Read [references/history-sources.md](references/history-sources.md) for the available local formats. Locate relevant threads by workspace, topic, and time before reading their messages. Prefer indexes and bounded queries over dumping transcripts.

For each relevant chat, capture the user's goal, decisions, completed work, open questions, corrections, and artifacts such as commits, branches, PRs, and tickets. Cite the provider and session or thread ID. Distinguish a proposal, a user-approved decision, an agent's completion claim, and verified completion.

Exclude the current chat and duplicate delegated runs from broad searches. A delegated run can be evidence when its parent references it or the question asks what that worker did. T3 messages and a provider transcript may describe the same conversation; correlate their IDs and count the work once. If a claim depends on which tools ran, inspect the relevant provider transcript rather than relying on a chat summary.

Follow the artifacts into the shared record when the topic needs it: git history, PRs and tickets, and referenced team discussions. Use available connectors or the user's established local readers. Investigate the sources that can resolve the question; report a missing source when it affects the conclusion. No exhaustive service sweep is required.

For a large corpus, delegate bounded read-only slices only when the session permits it. Use the existing `codex-delegation` skill if needed; retain the configured model unless instructed otherwise. Direct searches are enough for a few chats.

## Check what is true now

Check relevant branches, worktrees, commits, PR states, and tickets with git and the available host tools. A historical "done" message is not evidence that a change merged or deployed. Check deployed state only when relevant and accessible; otherwise label it unknown. A closed PR is not necessarily merged.

Newer explicit user decisions supersede earlier proposals. Current code establishes implementation state, not product intent. Preserve an unresolved conflict between code, tickets, and team decisions rather than guessing an agreement. Identify failures, reverted fixes, and recurring user reports that would change the next attempt.

## Return a short brief

Lead with the current state, then include:

- Relevant threads or workstreams, each with its actual status and an evidence pointer.
- Decisions and constraints that affect the next step.
- Remaining problems or questions, with uncertainty stated where it matters.
- The single most useful next action.

Keep the brief within a screen when possible. Preserve coverage and citations before extra detail. Apply `unslop` when available. Recall gathers context; it does not itself authorize edits, posting messages, merging, or deploying. Keep private history out of public artifacts.

## Attribution

Adapted from Lauren Tan's [pstack recall skill](https://github.com/cursor/plugins/blob/e43c7ee26e0038c6c1fa8380dd34ce86ff94cb2a/pstack/skills/recall/SKILL.md). This version supports Claude Code, Codex, and T3 history and has no required pstack dependencies.

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 Lauren Tan.
