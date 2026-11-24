---
name: sol-loop
description: Use when the user says "sol loop", or when another skill (such as full-stop) asks for a sol loop. Not for a one-off review; that's interrogate.
---

# Sol loop

You own the change. Two reviewers from different model families, Codex `gpt-6.2-sol` and Claude Opus, review and score it; you fix what's real and push back on what isn't, and you repeat until a round passes or the budget runs out. A round passes when **both reviewers score the change 9/10 or more and neither reports a `[blocking]` finding**. It doesn't have to come back with no findings at all. Use it before opening a PR, or on an open PR before asking for human review.

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

Each round, both reviewers get the same prompt and review the same head, at the same time. They are read-only and must not start their own subagents or reviewers. They are never told the bar of 9: knowing it pulls scores toward it.

The prompt (`$S/roundK.prompt.md`) says:

1. It is a read-only review of the repo in the current directory. It must not edit, create or delete files, or run anything with side effects (no commits, pushes, installs, docker or deploys).
2. The change is `git diff origin/<base>...HEAD` at head `<sha>`.
3. The contents of `context.md`.
4. Report only things that go wrong in a realistic scenario: wrong results, crashes, data loss, security or privacy problems, broken migrations or deploys, races, or a mismatch with what the change is meant to do. Skip style, naming, comments, docs, refactors, missing tests and hypothetical hardening.
5. Round 1 reviews the whole change. Later rounds review only the commits since the last round plus findings still open. Here is the ledger; don't raise anything under `Accepted` again.
6. Tag each finding `[blocking]` (in a realistic scenario: data loss, a security, auth or privacy problem, wrong money or legal output, or a broken migration or deploy) or `[minor]` (anything else worth fixing).
7. Score how ready the change is to merge as it stands, 1 to 10: 10 merge as is; 9 ready, anything left is minor and acceptable; 7–8 something should be fixed first; 5–6 a real bug on the main path or part of the ask missing; 1–4 wrong approach or serious harm likely. Judge it against what the change is meant to do, not an ideal design; a bigger change isn't a better one. Settled `Accepted` items don't lower the score.
8. Output only a numbered list, each line `[blocking|minor] file:line: the concrete failure. Fix: ...` (or `No findings.`), then a last line `SCORE: N/10` with one sentence on why.

How to run it:

- **In T3 Code:** two `delegate_task` calls started together, one with `target: {providerInstanceId: "codex", model: "gpt-6.2-sol", options: [{id: "reasoningEffort", value: "high"}]}` and one on Claude `opus`. Put the whole prompt in each task, since the children know nothing else. Wait for both with `task_status`.
- **Elsewhere:** `codex exec` from the review checkout, following the `codex-delegation` skill:

  ```sh
  codex exec -s read-only -m gpt-6.2-sol -c model_reasoning_effort=high \
    -o "$S/roundK.md" - < "$S/roundK.prompt.md" > "$S/roundK.log" 2>&1
  ```

  and, at the same time, Opus read-only:

  ```sh
  claude -p --model opus --permission-mode default --strict-mcp-config --no-session-persistence \
    --tools Read Grep Glob Bash --allowedTools Read Grep Glob 'Bash(git diff:*)' 'Bash(git show:*)' 'Bash(git log:*)' \
    < "$S/roundK.prompt.md" > "$S/roundK.opus.md" 2> "$S/roundK.opus.log"
  ```

  If the read-only sandbox can't start on this machine, run Codex without it. In that case, compare `git status --porcelain` before and after, and revert anything a reviewer changed.

Write both scores into the ledger after each round (`Round K: Sol 8, Opus 9, 1 blocking`). In byomeorg/hr, use the `fix-byome-issue` scripts instead, which run both reviewers and enforce the bar and the cap.

A clean result only counts if the reviewer actually read the code. Check its log or transcript for the diff and file reads. A clean result after a few seconds with no reads doesn't count as a round.

If a model is at capacity, wait two minutes and retry the same model. If Sol keeps failing, use `gpt-6.1-sol` high, then `gpt-5.6-sol`; if Opus keeps failing, use `sonnet`. Say so in the report. A round with only one reviewer's score doesn't count as passing.

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
- **Stop** when a round passes. Fix cheap, clearly right `[minor]` findings from that round, then stop; don't keep looping to push a passing score higher.
- **Stop early** when a round returns only things you'd decline (put them under `Accepted`; a round where you decline everything still needs both scores at 9 to count as passed).
- If new rounds keep finding new edge cases in the same code, the design is usually the problem. Step back and look for a simpler approach instead of adding another patch.
- When the budget runs out, stop. Leave what's still open as open; don't hide it.

## 6. Report

Tell the user:

- **Rounds:** how many rounds ran, which model, and the final head SHA.
- **Verdict:** `passed` (the last round on the final head had both scores at 9 or more and no `[blocking]` findings), with each reviewer's score per round; or `open`, followed by the open findings and the last scores. Report the verdict as it is. Don't call a round passed if it said otherwise.
- **Real problems caught:** one line each.
- **Declined findings:** what you declined or deferred, and why.

In the PR body, list open and declined findings that a reviewer should know about under "worth a careful look". Leave model and agent names out of the PR unless the repo already uses them.
