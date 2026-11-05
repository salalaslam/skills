---
name: t3-threads
description: Control other T3 Code threads through the T3 MCP tools. Create new threads, stop a running thread, switch a thread's model, resume an interrupted or failed thread, fork a thread, and send a message to another thread. Use when the user asks to start, stop, steer, re-model, resume, fork, or message a T3 thread other than the current one.
---

# T3 threads

T3 Code exposes thread control as MCP tools on its `t3-code` server. Harnesses may prefix the names, for example `mcp__t3-code__t3_thread_send`; the behaviour is the same. The tools are often deferred: load them with ToolSearch (`select:mcp__t3-code__t3_thread_read,...`) and try one call before deciding they're missing.

Written against T3 0.1.7 (November 2026). Tools that used to be separate are now one tool with an `action`: `t3_queue`, `t3_pending_request`, `t3_thread_transfer`, `t3_thread_organize`, `t3_thread_update`. `t3_thread_configure` both reads and sets the model. If a name below doesn't exist, check the live tool list rather than guessing.

An agent outside T3 can reach the same tools through the T3 server's HTTP MCP endpoint (`/mcp`). It authenticates with OAuth using a pairing code from `t3 auth pairing create`. Without a calling thread, pass `projectId` (or `scratch: true`) explicitly wherever it's accepted.

## Other machines

Every tool takes an optional `environmentId`. Without it, the tool acts on this T3 server.

- `t3_environment_links` lists linked machines and their `environmentId`. With one passed, thread and project IDs are that machine's, so always pass `threadId` too.
- A machine the user names that isn't linked: `t3_environment_link` with a `hint` from the user's words (for example `"vps"`). It shows the user a card; their answer arrives as a message in this thread. Never ask for a pairing code in chat or guess a URL.
- `t3_environment_read` shows this server's identity and preferences.

## Find the thread first

- By ID: the user may give a full ID (`mcp:…` or a UUID) or a prefix. Read it with `t3_thread_read`.
- By name or topic: `t3_thread_search` with `query` (title, branch, PR, project, then message text; skips subagent threads and isn't exhaustive), or `t3_thread_list` with `titleContains`, `statuses`, `settled`, `snoozed`, `includeSubagents`. Both default to the calling thread's project; use `allProjects: true` or a `projectId` from `t3_project_list`. Page `t3_thread_list` with `cursor`.
- Confirm you have the right thread before acting on it. When there are several matches, list them and ask.
- To show the user a thread, use the `link` field the tool returned, verbatim. Don't build links by hand or write a bare ID or title.

`t3_thread_read` returns the thread's status, active run, provider and model, pending request count, archive/settle/snooze flags and recent runs (`runLimit`). Read it before stopping, resuming or messaging a thread. `view: "activity"` shows every timeline item, including errors and tool activity; the default `messages` view shows only user and assistant messages and plans. Keep reads small with `limit` and `maxCharsPerItem`.

## 1. Create a thread

Create top-level threads only when the user asks for a new or separate thread. "Subagent", "delegate" and "parallel" don't mean a new thread; for child work owned by the current thread, use `delegate_task` instead.

- One thread: `t3_thread_launch` with `title`, the task in `message`, a `clientRequestId`, and a `workspaceStrategy`:
  - `{"type":"root"}` (or omit it) for the project's main checkout. It does not inherit the caller's worktree.
  - `{"type":"worktree","baseRef":"main","branch":"feature/x","startFromOrigin":false}` for a new worktree. To stack on another branch, use it as `baseRef` with `startFromOrigin: false`. Uncommitted changes are not copied, and don't put checkout setup in the prompt.
  - `{"type":"existing_worktree","worktreePath":"/abs/path","branch":"feature/x"}` for a project worktree that already exists (`t3_worktree_list` shows them).
  - `scratch: true` instead of `projectId` and `workspaceStrategy` for a thread with no repository.
- Leave out `message` (and `attachments`) to create an idle thread. Up to 8 uploaded `attachments` can go with the first message.
- `projectId`, `modelSelection`, `runtimeMode` (`approval-required`, `auto-accept-edits`, `auto`, `full-access`) and `interactionMode` (`default`, `plan`) inherit from the caller when omitted. The new thread can't have broader modes than the caller.
- If a call errors or the reply is lost, retry with the same `clientRequestId`; that won't create a duplicate. Follow up with `t3_thread_read` or `t3_thread_wait`.
- Several threads on the caller's own checkout: `create_threads` (up to 20, each with `title`, `prompt`, modes and an optional `target` with `providerInstanceId`, `model` and `options`). Project, branch and worktree inherit from the caller. For a thread in its own worktree, use `t3_thread_launch`.

## 2. Stop a thread

1. `t3_thread_interrupt` with `threadId`, a short `reason`, a `clientRequestId`, and `stop: true`. `stop: true` does what the thread's Stop button does: it interrupts whichever turn is running, holds queued messages, ends the thread's PR watches and stops every task it delegated.
   - Without `stop`, it only interrupts one turn (the newest, or `runId`). Queued messages then start a new turn, so use that only when the user wants the current turn cut short and the queue to carry on.
   - The result `status` is `interrupt_requested`, `no_active_run` (nothing was running), or the run's terminal status if it had already ended.
2. Confirm with `t3_thread_wait` (a short `timeoutMs` is fine). The run should end as `interrupted`.
3. If the user also wants queued messages gone, not just held: `t3_queue` with `action: "list"`, then `action: "cancel"` with each `queuedRunId`.

Related stops:

- A delegated child task started with `delegate_task`: `task_cancel` with its `taskId`. Don't use `t3_thread_interrupt` on a `childThreadId`.
- A Claude workflow running inside a thread: `t3_workflow_stop` with the coordinator's `subagentId` from `t3_thread_read` (`view: "activity"`). This stops only the workflow and leaves the thread running.

Stopping someone else's work is disruptive. Stop only threads the user named or clearly asked you to stop.

## 3. Switch a thread's model

1. `orchestrator_capabilities` lists provider instances, model IDs and each model's options (reasoning effort, fast mode, service tier). It returns a short list; pass `search` to find other models. Use only IDs and option values it lists. Skip providers whose constraints say they're disabled.
2. `t3_thread_configure` with only `threadId` reads the current provider, model and modes.
3. `t3_thread_configure` with `threadId` and `modelSelection` sets it:

   ```json
   {"instanceId":"claudeAgent","model":"claude-sonnet-5-5","options":[{"id":"effort","value":"high"}]}
   {"instanceId":"codex","model":"gpt-6.1-sol","options":[{"id":"reasoningEffort","value":"high"}]}
   ```

4. Call `t3_thread_configure` with only `threadId` again to confirm the change.

What to expect:

- The change applies from the next turn. A turn that's already running finishes on the old model. To make the switch apply now, send with `mode: "restart"` (section 5), or interrupt and then resume.
- Switching between providers (Claude ↔ Codex) works on a thread that already has history. T3 gives the new provider a context handoff of the earlier conversation.
- Permission modes (`runtimeMode`, `interactionMode`) stay as they are.
- If the user asks for a setting the model doesn't offer (for example `max`), report the mismatch. Don't quietly substitute a lower value.
- Never pick a model the user's instructions rule out (for example Fable models).

## 4. Resume a thread

There's no separate resume command. A thread whose last run ended as `interrupted`, `failed` or `completed` resumes when it gets a new message.

1. `t3_thread_read` with `view: "activity"` to find out why it stopped.
2. Fix the cause first:
   - A provider limit or outage (for example "Usage limit reached"): switch to a working model (section 3), then resume.
   - `waiting` with pending requests: the thread is blocked on a question. `t3_pending_request` with `action: "list"`, then `"read"` with a `requestId`, then `"respond"` with `answers`. It cannot approve permission requests (they aren't even listed); those need the user in the T3 app.
   - Stopped with held queued messages: they're still in `t3_queue` (`action: "list"`). Sending a new message resumes the thread; cancel or edit the queued ones first if they're stale.
   - Archived, settled or snoozed: `t3_thread_organize` with `unarchive`, `unsettle` or `unsnooze`.
3. Send the continuation with `t3_thread_send` (section 5), for example "Continue where you stopped. The usage limit is fixed." Tell the thread what changed; it won't know otherwise.
4. To retry from an earlier point without touching the original: `t3_thread_transfer` with `action: "fork"`, `threadId`, an optional `title`, and `sourcePoint` (`{"type":"latest_stable"}` by default, or `{"type":"run","runId":"…"}` or `{"type":"checkpoint","checkpointId":"…"}`). The fork gets the same setup and no turn runs until you send it a message. `action: "merge_back"` with `targetThreadId` brings a fork's context back into a related thread in the same project; `action: "status"` shows a thread's transfers.

## 5. Send a message to a thread

`t3_thread_send` with `threadId`, `message`, a `mode` and a `clientRequestId`:

| mode | Effect |
|---|---|
| `auto` (default) | Starts an idle thread, steers a running turn, or queues behind a turn that can't be steered yet |
| `queue` | Runs as a separate turn after the current one |
| `steer` | Adds the message to the turn in progress |
| `restart` | Interrupts the active turn and starts again with this message |

- Use one stable `clientRequestId` per message so that retries don't send it twice.
- The receiving agent sees it as a user message sent by another agent. Write it so it makes sense on its own: say who it's from if that matters, what you need, and what reply you expect.
- The target thread can't have broader permission modes than the caller.
- When you need a result back, put your own thread link in the message and ask for the reply with `t3_thread_send` to that link. Don't write "post it here": the receiver reads "here" as its own thread. A send to an idle thread wakes it, but nothing else does: `t3_thread_wait` only blocks, and a PR watch doesn't fire on a plain push. So the reply is your only wake-up.
- When a message from another thread asks you for a result, send the result to that thread with `t3_thread_send` when you're done, even if the message didn't spell that out.
- To follow up on a `delegate_task` child, send to its `childThreadId`. A send to a finished child starts a fresh task and returns its `taskId`. For a new review round, call `delegate_task` again instead.
- Files or images: upload them first (`t3_attachment_prepare_upload`), then `t3_thread_send_attachments` with the attachments and an optional `message`. It has no retry key, so don't resend blindly after an error.
- Queued messages: `t3_queue` with `action` `list`, `read`, `edit` (new `text`), `cancel`, `reorder` (`beforeRunId`, or null for the end) or `promote_to_steer` (into the active `targetRunId`). Writes fail once a message has left the queue.

## 6. Tidy a thread

- Rename: `t3_thread_update` with `action: "rename"` and `title`, or `action: "regenerate_title"`.
- Pin, snooze (`snoozedUntil`), settle, archive or mark unread: `t3_thread_organize`. A failed turn or a queued message leaves a thread active even after settling.

## Wait and read the result

- `t3_thread_wait` blocks until the run reaches a terminal state: `completed`, `failed`, `interrupted` or `cancelled`. An idle thread returns at once. On timeout, if the result has a `next`, follow it and end your turn; otherwise call again. `untilDelegatedWorkSettled: true` also waits for the thread's delegated and background tasks; `resultRun` then names the run with the final answer.
- Then `t3_thread_read` with `afterPosition` set to an earlier `nextPosition` to fetch only new items. Long items are cut off at `maxCharsPerItem`; page through them with `itemId` and `textOffset` set to `nextTextOffset`.
- Keep wait loops bounded. Don't poll with `sleep`, Monitor or ScheduleWakeup, and don't start a second copy of work that's already running.

## Rules

- Act only on threads the user named or clearly meant. Before stopping, re-modelling or messaging threads you only found by searching, list them and ask.
- Report what actually happened: the final run status, the model `t3_thread_configure` reads back, the reply you read. A tool returning success only means T3 accepted the request.
- Never edit T3's databases or session files directly. Use these tools.
