---
name: ask
description: Send the products team a phone-friendly multiple-choice link for open brief questions (the `ask` CLI on toucan, byome-ask.vercel.app). Use when Salal wants products or a PM to choose between options, says "ask link", "create ask link" or "prepare a link for these questions", or wants to check whether a link was answered.
---

# ask: product decision links

`ask` runs on toucan (from jj: `ssh toucan 'ask …'`). Code, poller details and deploy notes: `~/tools/ask/README.md`.

1. **Draft.** `ask new BRIEF_ID...` drafts one multiple-choice question per open brief item into `~/tools/ask/drafts/`. Each option has a trade-off (`detail`), a "Choose this if" line (`chooseIf`) and Suits us (dev) / Suits you (products) tags (`suits`).
2. **Show Salal first.** Give Salal the draft and a test link: copy the draft without its `brief:` keys and `ask push` the copy, so answering it closes nothing. Skip the test link only if Salal says so.
3. **Push.** `ask push FILE` prints the real link and a Slack line for Salal to send. One link per team. It stays open until every question is answered, or 14 days.
4. **If a Toucan owner thread is waiting on the answers,** push with `ask push FILE --thread KEY` so the poller wakes that thread, and keep `ask wait TOKEN` running in the background. It exits when answers come in; `ask show TOKEN` prints them.

`ask-poll.timer` sends progress notices while they answer. When they finish, it closes the brief items with the chosen options and notifies ntfy, Salal's WhatsApp and the thread.

`ask list` shows links. `ask revoke TOKEN` closes one, but a revoked link's answers still close their brief items and notify, so revoke test links with `--discard`.
