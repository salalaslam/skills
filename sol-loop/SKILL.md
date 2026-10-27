---
name: sol-loop
description: Use when the user says "sol loop", or when another skill (such as full-stop) asks for a sol loop. Not for a one-off review; that's interrogate.
---

# Sol loop

You own the change. Codex `gpt-6.1-sol` reviews it, you fix what's real and push back on what isn't, and you repeat until a round comes back clean or the budget runs out. Use it before opening a PR, or on an open PR before asking for human review.

The goal is the smallest change that does what was asked, made correct. Reviews make the change right, not bigger.

## 1. Scope

- **Your own branch:** the change is `git diff origin/<base>...HEAD`. Fetch first.
- **A PR:** review its head in a separate worktree (`gh pr checkout` inside `git worktree add`, or `git fetch origin pull/<n>/head`). Never switch branches in a checkout that has uncommitted work or that another session uses.
- Commit before each round so every round reviews a known head.

## 2. State files

Make a state dir outside the repo and outside `/tmp` (a reboot wipes `/tmp`): `S=~/.cache/sol-loop/<repo>-<slug>`. Write two files once:

- `$S/context.md`: a few lines on what the repo does, what this change is meant to do, and where a bug would hurt most (data loss, auth and permissions, money, migrations, deploy). Name the failure modes worth checking.
- `$S/ledger.md`: two lists, `Fixed:` and `Accepted, do not report again:`. Update it after every round.

## 3. One round

Run one reviewer at a time. The reviewer is read-only and must not start its own subagents or reviewers.

The prompt (`$S/roundK.prompt.md`) says:

1. It is a read-only review of the repo in the current directory. It must not edit, create or delete files, or run anything with side effects (no commits, pushes, installs, docker or deploys).
2. The change is `git diff origin/<base>...HEAD` at head `<sha>`.
3. The contents of `context.md`.
4. Report only things that go wrong in a realistic scenario: wrong results, crashes, data loss, security or privacy problems, broken migrations or deploys, races, or a mismatch with what the change is meant to do. Skip style, naming, comments, docs, refactors, missing tests and hypothetical hardening.
5. Round 1 reviews the whole change. Later rounds review only the commits since the last round plus findings still open. Here is the ledger; don't raise anything under `Accepted` again.
6. Output a numbered list, each with `file:line`, the concrete failure and a suggested fix. If there's nothing worth fixing, output exactly `No further issues.`

How to run it:

- **In T3 Code:** `delegate_task` with `target: {providerInstanceId: "codex", model: "gpt-6.1-sol", options: [{id: "reasoningEffort", value: "high"}]}`. Put the whole prompt in the task, since the child knows nothing else. Wait for it with `task_status`.
- **Elsewhere:** `codex exec` from the review checkout, following the `codex-delegation` skill:

  ```sh
  codex exec -s read-only -m gpt-6.1-sol -c model_reasoning_effort=high \
    -o "$S/roundK.md" - < "$S/roundK.prompt.md" > "$S/roundK.log" 2>&1
  ```

  If the read-only sandbox can't start on this machine, run without it. In that case, compare `git status --porcelain` before and after, and revert anything the reviewer changed.

A clean result only counts if the reviewer actually read the code. Check its log or transcript for the diff and file reads. A clean result after a few seconds with no reads doesn't count as a round.

If the model is at capacity, wait two minutes and retry the same model. If it keeps failing, use `gpt-6-astra` high and say so in the report.

## 4. Handle findings

For each finding:

1. Check it against the code. Reviewers are sometimes wrong.
2. **Real and in scope:** make the smallest fix that resolves it, then add a line under `Fixed:`.
3. **Wrong, a trade-off you accept, or a nitpick:** add it under `Accepted` with a one-line reason. Push back when you disagree; don't fix things just to make the reviewer happy.
4. **Real but outside this change's purpose:** don't fix it here. Note it as a follow-up for the report.

Then run the repo's own checks (typecheck, lint, tests), commit, and start the next round.

## 5. Budget

- **3 rounds** by default.
- **Up to 5** only when the open findings involve security, permissions, data loss, money, migrations or deploys.
- **Stop early** when a round returns `No further issues.`, or returns only things you'd decline.
- If new rounds keep finding new edge cases in the same code, the design is usually the problem. Step back and look for a simpler approach instead of adding another patch.
- When the budget runs out, stop. Leave what's still open as open; don't hide it.

## 6. Report

Tell the user:

- **Rounds:** how many rounds ran, which model, and the final head SHA.
- **Verdict:** `clean` (the last round said `No further issues.` on the final head), or `open` followed by the list of open findings. Report the verdict as it is. Don't call a round clean if it said otherwise.
- **Real problems caught:** one line each.
- **Declined findings:** what you declined or deferred, and why.

In the PR body, list open and declined findings that a reviewer should know about under "worth a careful look". Leave model and agent names out of the PR unless the repo already uses them.
