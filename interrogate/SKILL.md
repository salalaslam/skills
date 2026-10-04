---
name: interrogate
description: "Use for \"interrogate\", \"adversarial review\", \"multi-model review\", \"challenge this\", \"stress test this code\", \"find blind spots\", or \"tear this apart\". Multiple LLM reviewers challenge changes from independent angles."
disable-model-invocation: true
---

# Interrogate

Run one read-only reviewer per model to adversarially review code changes. Each model gets the same prompt and rubric. The adversarial signal comes from model diversity, not assigned personas.

The deliverable is a synthesized verdict. Do NOT auto-apply changes, and do not post to GitHub until the user says so.

## Step 1, Determine Scope

Identify what to review from context:

- If the user points at specific files, a diff, or a PR, use that. For a PR, review its head as in the `codex-review` skill: fetch it into a worktree, never switch branches in a checkout with uncommitted work.
- If on a feature branch, run `git fetch origin <base>` and `git diff origin/<base>...HEAD` for the full changeset
- If the user's message references recent work, gather the relevant files

Package the diff (or file contents) plus any surrounding context files the reviewers need to understand the code. Reviewers can also read the checkout themselves, so point them at it.

## Step 2, State the Intent

Before starting reviewers, state the intent explicitly. Derive this from:

- The user's message
- Commit messages
- PR description if one exists
- The code itself

Write one clear paragraph. If you're unsure about the intent, ask the user before proceeding.

## Step 3, Run Reviewers

Use the reviewers or models the user names. Otherwise use these defaults:

| Reviewer | Default model | How to run |
|----------|---------------|------------|
| Reviewer A | Claude `opus` | Claude Code: a `general-purpose` subagent with `model: opus`, told it is read-only. Elsewhere: `claude -p` (below). |
| Reviewer B | Codex `gpt-6-astra`, high reasoning | `codex exec` (below) |
| Reviewer C | Codex `gpt-5.6-sol`, high reasoning | `codex exec` (below) |

Read `references/reviewer-prompt.md` and fill in the template with:
1. The stated intent
2. The diff or file contents
3. The review rubric from `references/rubric.md`
4. The code-quality lens from `references/code-quality-review.md`

The same filled template goes to all reviewers, so every model applies the code-quality lens. Write it once to `/tmp/interrogate-<slug>.prompt` and start all reviewers at the same time, in the background, with long timeouts (high reasoning can take 10+ minutes). Follow the `codex-delegation` skill for timeouts and process handling.

Codex reviewer, run from the review checkout:

```sh
codex exec -s read-only -m gpt-6-astra -c 'model_reasoning_effort="high"' \
  -o /tmp/interrogate-<slug>-B.md - < /tmp/interrogate-<slug>.prompt \
  > /tmp/interrogate-<slug>-B.log 2>&1
```

Claude reviewer outside Claude Code:

```sh
claude -p --model opus --allowedTools Read Grep Glob 'Bash(git diff:*)' 'Bash(git log:*)' 'Bash(git show:*)' \
  < /tmp/interrogate-<slug>.prompt > /tmp/interrogate-<slug>-A.md 2>/tmp/interrogate-<slug>-A.log
```

Check `codex --version` and `codex exec --help` before relying on these flags. Never use the dangerous bypass flags. After each run, confirm from its log or transcript that the reviewer actually read the diff or files. A "no findings" result only counts if it saw the code.

If a model is rejected or unavailable, run that reviewer on the next tier of the same family (`gpt-6-astra` → `gpt-5.6-sol` → `gpt-5.6-terra`, `opus` → `sonnet`) and say so. If a reviewer fails, show the tail of its log and continue with the rest. Do not block the review on one reviewer.

## Step 4, Synthesize

As results come back, build a unified picture:

1. **Parse all findings** from the reviewers
2. **Identify consensus**. Findings raised by 2+ models independently are highest signal.
3. **Identify lone-model findings**. Still worth reading, but weight accordingly.
4. **Deduplicate**. Different models may describe the same issue differently. Merge these and note which models raised it.
5. **Note disagreements**. If one model flags something and another explicitly says the opposite, that's useful context for the verdict.

## Step 5, Lead Judgment

You are the lead reviewer, a pragmatic senior engineer, not a neutral aggregator. Check each finding against the code yourself. Reviewer findings are leads, not results.

Read `references/lead-judgment.md` for the full framework.

Categorize every finding using these buckets:

- **Act on**. Real issues affecting correctness, security, or maintainability given the actual goals. These would block a real PR.
- **Consider**. Legitimate points, but you're not sure they outweigh the cost of addressing them right now. Worth the user's attention.
- **Noted**. Technically valid but not actionable. Context-dependent, premature optimization, or low-impact given the current stage.
- **Dismissed**. Wrong, nitpicky, or missing context. Brief explanation why.

For each finding, include:
- Which model(s) raised it
- The category (act on / consider / noted / dismissed)
- A one-line rationale for the categorization

## Output Format

Keep it short: one or two lines per finding, with `file:line`. Apply `unslop` when available. Present the verdict in this structure:

### Intent
> [The stated intent paragraph from Step 2]

### Reviewers
- Reviewer [label]: [model name], [N findings] (one bullet per reviewer)

### Act On
[Findings that should be addressed. For each: description, which models raised it, why it matters.]

### Consider
[Findings worth thinking about. For each: description, which models raised it, tradeoff involved.]

### Noted
[Valid but low-priority. Brief list.]

### Dismissed
[Rejected findings with brief rationale.]

### Agreement Map
[Where did models agree, where did they diverge, and what does the pattern of agreement/disagreement tell us?]

Then ask whether to fix the Act On findings, post them on the PR, or both. Remove any worktree you created once the user is done with it.

## Attribution

Adapted from Lauren Tan's [pstack interrogate skill](https://github.com/cursor/plugins/blob/e43c7ee26e0038c6c1fa8380dd34ce86ff94cb2a/pstack/skills/interrogate/SKILL.md). This version runs reviewers on Claude and Codex instead of pstack's Cursor model configuration. The reference files are upstream with minor wording changes.

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 Lauren Tan.
