# Local history sources

Read only the source sections needed for the requested scope. Paths below are defaults; honor the current environment's configured locations. Never read authentication files to find conversations.

## T3 Code

Local state is usually `~/.t3/userdata/state.sqlite`. Open SQLite read-only. Inspect `sqlite_master` and `PRAGMA table_info(...)` before assuming a schema, since versions can differ.

The current local schema has:

- `projection_projects`: `project_id`, `title`, `workspace_root`.
- `projection_threads`: `thread_id`, `project_id`, `title`, `worktree_path`, `created_at`, `updated_at`, `deleted_at`.
- `projection_thread_messages`: `message_id`, `thread_id`, `role`, `text`, `created_at`.
- `projection_thread_sessions`: `thread_id`, `provider_name`, `provider_session_id`, `provider_thread_id`.

Use project roots and worktree paths to identify candidates. Match a named thread directly, including archived or deleted history if that is what the user requested. For broad searches, skip deleted threads unless relevant. Search titles first; also search scoped message text if titles do not identify the topic.

This example reads one specified thread, not the full history. Replace the ID with the user's or a discovered candidate's ID after checking the schema:

```python
import sqlite3
from pathlib import Path

db = Path.home() / ".t3/userdata/state.sqlite"
thread_id = "the-requested-thread-id"
with sqlite3.connect(db.as_uri() + "?mode=ro", uri=True) as conn:
    rows = conn.execute(
        "SELECT role, text, created_at FROM projection_thread_messages "
        "WHERE thread_id = ? ORDER BY created_at, message_id",
        (thread_id,),
    )
    for role, text, created_at in rows:
        print(created_at, role, text)
```

T3's provider-session mapping helps locate the underlying Claude or Codex transcript. A T3 thread ID is not necessarily its provider session ID. Avoid reading orchestration payloads when the message projection answers the question.

## Codex

Use the configured Codex home, usually `~/.codex`. Inspect available `state_*.sqlite` files and their schemas; a filename's version suffix is not a recency guarantee. Open them with SQLite `mode=ro` as above.

The current `threads` table includes `id`, `cwd`, `title`, `first_user_message`, `rollout_path`, `created_at`, `updated_at`, `source`, and `agent_path`. Filter by workspace and time, then search bounded title and prompt fields. Do not print an entire `title`: it can contain a long task prompt. Skip obvious subagent rows in a broad search, but do not discard `source='exec'` universally; independent user-requested CLI work can use it too.

`session_index.jsonl` and `history.jsonl` can be useful indexes but may omit conversations started through other clients. An empty index does not establish that there is no history.

Read a relevant thread's `rollout_path` as JSONL. Common records include:

- `event_msg` with `payload.type='user_message'` and a `message` field.
- `response_item` with `payload.type='message'`, a `role`, and a `content` list whose text blocks include `text`.
- Tool calls and outputs under `response_item`, useful for checking actions and failures.

Inspect a few records before extracting fields. The same message may appear as an event and a response item. Ignore injected environment or instruction blocks as evidence of the user's preferences. Scan relevant regions and retain timestamps and IDs for citations. Include `archived_sessions/` when the requested session or range requires it.

## Claude Code

Conversation files usually live under `~/.claude/projects/<encoded-workspace>/`. List project directories and confirm their workspace rather than assuming that string replacement reproduces every encoded path. Main sessions are commonly `<session-id>.jsonl`; nested `subagents/` contain delegated transcripts.

Order candidates by real timestamps or modification time, never by UUID. `history.jsonl` is a supplementary prompt index and may contain only interactive CLI activity.

Parse JSONL. Common conversation records have `type='user'` or `type='assistant'`, with `message.content` as a string or a list of blocks. Extract text blocks for conversation search; keep tool-use and tool-result blocks when verifying what happened. Summaries and compacted transcripts may omit the original evidence, so follow referenced sessions when the answer depends on it.

Do not count injected skill instructions, system reminders, command wrappers, or quoted assistant text as independent user preferences or approvals.

## Search and coverage

Start with `rg --files` for transcript discovery and `rg -n` for scoped topic searches. Use parameterized SQL for identifiers, time bounds, workspace roots, and search terms. Bound discovery output, then fetch matching messages in chronological order. Paginate rather than silently truncating an explicit request for all matching history.

When filtering a worktree, verify its main repo with git before broadening to other paths. If a source is absent, locked, or structurally unfamiliar, report that gap and continue with the sources that are readable. Do not write to the history databases or rebuild their indexes.
