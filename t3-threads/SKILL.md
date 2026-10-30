---
name: t3-threads
description: Control other T3 Code threads through the T3 MCP tools. Create new threads, stop a running thread, switch a thread's model, resume an interrupted or failed thread, and send a message to another thread. Use when the user asks to start, stop, steer, re-model, resume, or message a T3 thread other than the current one.
---

# T3 threads

T3 Code exposes thread control as MCP tools on its `t3-code` server. Harnesses may prefix the names, for example `mcp__t3-code__t3_thread_send`; the behaviour is the same. If the tools aren't listed at first, try one direct call such as `orchestrator_capabilities` before deciding they're missing.

An agent outside T3 can reach the same tools through the T3 server's HTTP MCP endpoint (`/mcp`). It authenticates with OAuth using a pairing code from `t3 auth pairing create`. Without a calling thread, pass `projectId` explicitly wherever it's accepted.

## Find the thread first

- By ID: the user may give a full ID (`mcp:…` or a UUID) or a prefix. Read it with `t3_thread_read`.
- By name or topic: `t3_thread_search` with `query`, or `t3_thread_list` with `titleContains` and `statuses`. Both default to the calling thread's project; get other project IDs from `t3_project_list`.
- Confirm you have the right thread before acting on it. When there are several matches, list them and ask.
- To show the user a thread, write `[title](t3-thread://v1/<threadId>)` with the ID exactly as returned, not URL-encoded.

`t3_thread_read` returns `status`, `activeRunId`, `providerInstanceId`, `model`, `pendingRequestCount`, the archive, settle and snooze flags, and the recent runs. Read it before stopping, resuming or messaging a thread. Use `view: "activity"` to see errors and tool activity. The default `messages` view shows only user and assistant messages.

## 1. Create a thread

Create top-level threads only when the user asks for a new or separate thread. For child work owned by the current thread, use `delegate_task` instead.

- One thread: `t3_thread_launch` with `title`, the task in `message`, and a `workspaceStrategy`:
  - `{"type":"root"}` (or omit it) for the project's main checkout. It does not inherit the caller's worktree.
  - `{"type":"worktree","baseRef":"main","branch":"feature/x","startFromOrigin":false}` for a new worktree. Uncommitted changes are not copied.
  - `{"type":"existing_worktree","worktreePath":"/abs/path","branch":"feature/x"}` for a checkout that already exists (`t3_worktree_list` shows them).
  - `scratch: true` instead of `projectId` for a thread with no repository.
- Leave out `message` to create an idle thread.
- `projectId`, `modelSelection`, `runtimeMode` and `interactionMode` inherit from the caller when omitted. The new thread can't have broader modes than the caller.
- `t3_thread_launch` has no retry key. Keep the returned `threadId`. If a call errors or the response is lost, check `t3_thread_list` before you launch again, or you may create a duplicate.
- Several threads on the caller's own checkout: `create_threads` (up to 20, per-thread `target`, `prompt`, modes). This works only from inside a T3 thread.

## 2. Stop a thread

1. `t3_thread_interrupt` with `threadId`, a short `reason` and a `clientRequestId`. Without `runId` it stops the newest interruptible run. A thread with no active turn is left alone.
2. Confirm with `t3_thread_wait` (a short `timeoutMs` is fine). The run should end as `interrupted`.
3. Queued messages start a new turn once the current one ends. If the user wants the thread to stay stopped, check `t3_queue_list` and cancel each queued run with `t3_queue_cancel`.

Related stops:

- A delegated child task started with `delegate_task`: `task_cancel` with its `taskId`.
- A Claude workflow running inside a thread: `t3_workflow_stop` with the coordinator's `subagentId` from `t3_thread_read` (`view: "activity"`). This stops the whole workflow and leaves the thread running.

Stopping someone else's work is disruptive. Stop only threads the user named or clearly asked you to stop.

## 3. Switch a thread's model

1. `orchestrator_capabilities` lists provider instances, model IDs and each model's options (reasoning effort, fast mode, service tier). Use only IDs and option values it lists. Skip providers whose `constraints` say they're disabled.
2. `t3_thread_configuration` with `threadId` shows the current selection and modes.
3. `t3_thread_configure` with `threadId` and `modelSelection`:

   ```json
   {"instanceId":"claudeAgent","model":"claude-sonnet-5-5","options":[{"id":"effort","value":"high"}]}
   {"instanceId":"codex","model":"gpt-6.1-sol","options":[{"id":"reasoningEffort","value":"high"}]}
   ```

4. Read `t3_thread_configuration` again to confirm the change.

What to expect:

- The change applies from the next turn. A turn that's already running finishes on the old model. To make the switch apply now, interrupt the thread and resume it.
- Switching between providers (Claude ↔ Codex) works on a thread that already has history. T3 gives the new provider a context handoff of the earlier conversation.
- This doesn't change `runtimeMode` or `interactionMode`.
- If the user asks for a setting the model doesn't offer (for example `max`), report the mismatch. Don't quietly substitute a lower value.

## 4. Resume a thread

There's no separate resume command. A thread whose last run ended as `interrupted`, `failed` or `completed` resumes when it gets a new message.

1. `t3_thread_read` with `view: "activity"` to find out why it stopped.
2. Fix the cause first:
   - A provider limit or outage (for example "Usage limit reached"): switch to a working model (section 3), then resume.
   - `waiting` with `pendingRequestCount > 0`: the thread is blocked on a question. Read it with `t3_pending_request_list` / `t3_pending_request_read` and answer with `t3_pending_request_respond`. That tool cannot approve permission requests; those need the user in the T3 app.
   - Archived, settled or snoozed: `t3_thread_organize` with `unarchive`, `unsettle` or `unsnooze`.
3. Send the continuation with `t3_thread_send` (section 5), for example "Continue where you stopped. The usage limit is fixed." Tell the thread what changed; it won't know otherwise.
4. To retry from an earlier point without touching the original, use `t3_thread_fork` with `{"type":"latest_stable"}` or a specific `runId`. The fork inherits the source's configuration.

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
- To follow up on a `delegate_task` child, send to its `childThreadId`. For a new review round, call `delegate_task` again instead.
- Edit or reorder queued messages with `t3_queue_edit`, `t3_queue_reorder` and `t3_queue_promote_to_steer`.

## Wait and read the result

- `t3_thread_wait` blocks until the run reaches a terminal state: `completed`, `failed`, `interrupted` or `cancelled`. A timeout returns `timedOut: true` and leaves the work running, so call it again or read the thread later.
- Then `t3_thread_read` with `afterPosition` set to an earlier `nextPosition` to fetch only new items. Long items are cut off at `maxCharsPerItem`; page through them with `itemId` and `textOffset`.
- Keep wait loops bounded. Don't start a second copy of work that's already running.

## Rules

- Act only on threads the user named or clearly meant. Before stopping, re-modelling or messaging threads you only found by searching, list them and ask.
- Report what actually happened: the final run status, the model shown in `t3_thread_configuration`, the reply you read. A tool returning success only means T3 accepted the request.
- Never edit T3's databases or session files directly. Use these tools.
