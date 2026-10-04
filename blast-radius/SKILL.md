---
name: blast-radius
description: Investigate downstream breakage from a change beyond its diff, and verify the key safety assumptions with real code. Use for regression-risk reviews, "what could this break", or a blast-radius assessment.
---

# Blast radius

Find what a change could break elsewhere. Trace concrete failure paths and prove the key assumptions behind its safety. A convincing explanation alone does not establish that the change is safe.

## Establish the change

Use the caller's diff, files, commit, or PR. Confirm the base and head before reviewing a branch; use its actual base rather than assuming `main`. Include working-tree changes when they are in scope. Read the intended behavior and relevant PR or commit context. Do not change the checkout or widen the review to unrelated pre-existing bugs.

State what now behaves differently, including changes the diff leaves implicit. Identify the important invariants the change relies on, such as ownership, authorization, ordering, serialization format, or which state a call is allowed to modify. There may be several independent assumptions; proving one does not clear unrelated risks.

## Follow the effects

Use `rg` for direct callers, then investigate connections a symbol search misses:

- API responses, stored values, wire formats, exports, and consumers in other services or languages.
- Permissions and validation across different entry points to the same operation.
- Concurrent writers, retries, transaction and lock ordering, stale reads, teardown, and asynchronous callbacks.
- Feature flags, caches, generated clients, and version-dependent library behavior.

Choose the paths the change actually touches. Inspect the dependency version the repo ships and any local patches before relying on library behavior. Search results establish coverage, not safety: no callers found may mean an indirect consumer or a different representation.

For each suspected issue, trace a concrete trigger through the relevant guards to an observable failure. Cite real code. Separate confirmed risks, plausible unproven risks, and checked cases that are safe. Describe the conditions and impact instead of inventing probability estimates.

## Prove the assumptions

Use the strongest practical evidence for each material assumption:

1. Source evidence at a real file and line.
2. A traced failing or safe scenario through the actual control flow.
3. A small reproducible script or existing test that calls the real code and checks the result.
4. Reproduction through the running app's user-facing path, including relevant side effects.

Say where the evidence stops. Code inspection is not an executed reproduction. Mark unverified assumptions as unproven rather than clearing them.

Prefer the smallest check that could show the assumption is false. Record its command, inputs, observed result, and evidence path. If adding or changing a test, apply the existing `test-audit` skill when available; avoid tests that only mirror the implementation. Keep temporary proofs outside the repo unless a durable regression check belongs in the requested change.

For browser verification in T3, use its collaborative preview tools when available: check status, open a preview if needed, then inspect and drive the app. Use another browser system only when T3 preview is absent, explicitly unavailable, or the user requests it. Use isolated local state for destructive scenarios; do not mutate production or send external messages merely to prove a review finding. Report the missing proof if it needs authorization beyond the task.

For a wide or high-consequence change, an independent read-only review can help if delegation is permitted. Use the existing `codex-delegation` skill if needed and keep the configured model unless instructed otherwise. Validate each returned finding; agreement between reviewers is not proof. No `arena` or multi-model panel is required.

## Report

Lead with the verdict and strongest evidence. Include:

- What changed and which downstream behavior it affects.
- Key safety assumptions, each proven to a stated level or marked unproven.
- Actionable risks with a trigger, impact, code citation, and reproduction or cheapest remaining check.
- Cases checked and cleared, plus material coverage gaps.

Keep the report proportional to the change. Apply `unslop` when available. Reviewing does not authorize fixing, posting findings, merging, or deploying; follow the user's requested scope.

## Attribution

Adapted from Lauren Tan's [pstack blast-radius skill](https://github.com/cursor/plugins/blob/e43c7ee26e0038c6c1fa8380dd34ce86ff94cb2a/pstack/skills/blast-radius/SKILL.md). This version works without pstack's `how`, `why`, or `arena` skills and uses the current environment's verification tools.

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 Lauren Tan.
