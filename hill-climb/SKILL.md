---
name: hill-climb
description: Use when the user says "hill climb", "climb until", or asks to keep improving something until it reaches a score. Works for any work with a result that can be scored: UI, writing, speed, token use, test pass rate, eval results.
---

# Hill climb

Improve something in rounds. Each round: change it, score it, keep the change if the score went up, undo it if not. Stop when the target is reached, when progress stalls, or when the budget runs out.

## 1. Agree on the score first

Before any change, write down:

- **What's being improved**, and what must not get worse ("send less data, with no visible UI change").
- **How it's scored.** Prefer a number a program produces: tests passing, an eval, a benchmark, bundle size, token count, response time. Programs give the same answer every time.
- **If no program can score it** (design, writing, UX), use judge models: Codex `gpt-6.1-sol` and Claude Opus. Give each the same short rubric, 4–6 categories, each out of 10. Show them the work directly: screenshots for UI, the text for writing.
- **Something to compare against.** Judges score honestly only when they see the work next to something else: the version before, competing products, or the best example available. Always include at least one.
- **The target.** Default 9/10 for judged work. For program scores, use the user's number.
- **The budget.** Default 8 rounds or 4 hours, whichever comes first.

If the scoring isn't clear, ask the user before starting. The agent will push hard on whatever score it's given, even a bad one.

## 2. Score the starting point

Score the current version and the comparison examples. For judged work, score the same thing twice and note the difference between the two scores. That difference is the noise: a change smaller than it doesn't count as progress.

Keep a running log outside the repo (`~/.cache/hill-climb/<slug>/log.txt`): each round's change, scores and decision.

## 3. Each round

1. Pick the biggest weakness from the last scores and fix it.
2. Commit, so every round can be undone.
3. Re-score. Use the cheapest judge first, and add the next judge only after the first one reaches the target.
4. If the score rose by more than the noise, keep the change. Otherwise revert it, note what didn't work, and try something else.
5. Check that nothing that must not get worse did: tests, other categories, earlier gains.

Judges:

- are read-only, and never edit anything.
- are never told the target. Knowing it pulls their scores toward it.
- get the same rubric and comparison examples every round.

You:

- never change the scorer, tests or rubric to raise the score. If the scorer seems wrong, stop and tell the user.
- stop and say so if the score rises but the work looks worse to you, for example a design that turns gray and lifeless.

## 4. When to stop

Stop at whichever comes first:

- **Target reached:** every judge scores every category at or above the target.
- **Stalled:** two rounds in a row each improved by less than the noise (judged work: under ~0.2 points; program scores: under 1%, or no new passing cases). Report where it got stuck and suggest a different approach rather than more of the same.
- **Budget spent.**
- **Getting worse:** two rounds in a row lowered the score. Go back to the best version.

## 5. Going past the target

Never raise the target yourself. When it's reached, ask the user (`AskUserQuestion` in Claude Code, `request_user_input` in Codex):

- **Stop here** (recommended)
- **Push to 9.5:** expect at least as many rounds again as it took to get here.
- **Push to 10**

Say it plainly: the last half point usually costs more than everything before it, and part of the rise may be judges drifting, not real improvement.

## 6. Report

- A score table: each round, each judge, each category, plus the comparison examples.
- What helped (one line each) and what was tried and undone.
- Why it stopped: target reached, stalled, budget spent, or getting worse.
- Time and usage spent, if known.
- The final commit or PR.
