---
name: codex-delegation
description: Delegate bounded tasks to Codex or run Codex from scripts and applications. Covers interface choice, CLI execution, output capture, and session resume.
---

# Codex delegation and programmatic use

Give each delegated task a clear outcome, relevant context, and a file scope. Inspect its changes and run relevant checks before accepting the result. Give concurrent editing runs separate worktrees or non-overlapping file scopes.

## Choose an interface

- Use native subagent tools for independent work within the current task when available and permitted by the session instructions.
- Use `codex exec` for shell scripts, CI jobs, or a separate CLI process.
- Use the official Codex SDK for application integration. The packages are `@openai/codex-sdk` for TypeScript and `openai-codex` for Python. Check the [SDK documentation](https://developers.openai.com/codex/sdk/) for the chosen language's API.
- Use `codex mcp-server` when the caller needs Codex exposed through MCP.

Keep the configured model and reasoning effort unless the user or task instructions call for an override. Check available models before selecting one.

## Run the CLI

Check `codex --version` and the relevant subcommand's `--help` before using unfamiliar flags. Pass multiline prompts through stdin.

For an editing task, set the repository and output paths, then run:

```sh
codex exec -C "$repo" --sandbox workspace-write --json \
  -o "$final_file" - < "$prompt_file" > "$events_file" 2> "$stderr_file"
```

Use `--sandbox read-only` for analysis. Do not assume the configured default is read-only. Use `danger-full-access` only when the task requires it and the execution environment permits it. Add `--skip-git-repo-check` only when intentionally running outside a Git repository.

With `--json`, stdout contains JSONL events throughout the run. The `-o` file contains the final response. Without `--json`, stdout normally contains the final response and stderr carries progress. Check the process and captured output before treating a quiet run as stalled. Use `--output-schema` when another program needs a defined response shape.

Retain the process or task handle until completion. Use the caller's supported timeout or cancellation API. A tool returning a running-session handle has not necessarily timed out or stopped the process. On cancellation, stop that specific run and inspect its exit status and partial output before retrying. Do not assume GNU `timeout` is installed on macOS.

## Continue a run

Capture `thread_id` from the JSONL events and resume that session with a follow-up prompt:

```sh
codex exec resume --json -o "$final_file" "$thread_id" - \
  < "$prompt_file" > "$events_file" 2> "$stderr_file"
```

Avoid `resume --last` when runs may overlap. With an SDK, retain the thread ID and use its resume API.
