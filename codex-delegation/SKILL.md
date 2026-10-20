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

Default to `gpt-6.1-sol` with `high` reasoning: pass `-m gpt-6.1-sol -c model_reasoning_effort=high`. Use a different model or reasoning level only when the user or task instructions ask for one, and check the current catalog before selecting it.

## Verified CLI models

Verified on 2026-10-17 against the visible models in `~/.codex/models_cache.json`, fetched that day by Codex CLI `0.163.0`. This list reflects this installation's model catalog and goes out of date; check the current catalog before relying on it.

| Model ID | Supported reasoning levels |
| --- | --- |
| `gpt-6.1-sol` | `low`, `medium`, `high`, `xhigh`, `max`, `ultra` |
| `gpt-6-astra` | `low`, `medium`, `high`, `xhigh`, `max`, `ultra` |
| `gpt-6-sol` | `low`, `medium`, `high`, `xhigh`, `max`, `ultra` |
| `gpt-6-luna` | `low`, `medium`, `high`, `xhigh`, `max` |
| `gpt-5.6-sol` | `low`, `medium`, `high`, `xhigh`, `max`, `ultra` |
| `gpt-5.6-terra` | `low`, `medium`, `high`, `xhigh`, `max`, `ultra` |
| `gpt-5.6-luna` | `low`, `medium`, `high`, `xhigh`, `max` |

## Run the CLI

Check `codex --version` and the relevant subcommand's `--help` before using unfamiliar flags. Pass multiline prompts through stdin.

For an editing task, set the repository and output paths, then run:

```sh
codex exec -C "$repo" --sandbox workspace-write --json \
  -m gpt-6.1-sol -c model_reasoning_effort=high \
  -o "$final_file" - < "$prompt_file" > "$events_file" 2> "$stderr_file"
```

Use `--sandbox read-only` for analysis. Do not assume the configured default is read-only. Use `danger-full-access` only when the task requires it and the execution environment permits it. Add `--skip-git-repo-check` only when intentionally running outside a Git repository.

With `--json`, stdout contains JSONL events throughout the run. The `-o` file contains the final response. Without `--json`, stdout normally contains the final response and stderr carries progress. Check the process and captured output before treating a quiet run as stalled. Use `--output-schema` when another program needs a defined response shape.

Retain the process or task handle until completion. Use the caller's supported timeout or cancellation API. A tool returning a running-session handle has not necessarily timed out or stopped the process. On cancellation, stop that specific run and inspect its exit status and partial output before retrying. Do not assume GNU `timeout` is installed on macOS.

## Continue a run

Capture `thread_id` from the JSONL events and resume that session with a follow-up prompt:

```sh
codex exec resume --json -m gpt-6.1-sol -c model_reasoning_effort=high \
  -o "$final_file" "$thread_id" - \
  < "$prompt_file" > "$events_file" 2> "$stderr_file"
```

`codex exec resume` rejects `--sandbox` and `-C` after `resume`. Put them before it: `codex exec -C "$repo" --sandbox read-only resume ...`. Resume also accepts `-c sandbox_mode=read-only`. Choose the sandbox mode the task needs.

Avoid `resume --last` when runs may overlap. With an SDK, retain the thread ID and use its resume API.

## Known failures

These failures have come up in real delegated runs. Check the error against this list before retrying.

| Error or symptom | Cause and fix |
| --- | --- |
| `unexpected argument '--search' found` | `--search` is a top-level flag. Put it before the subcommand: `codex --search exec ...`. |
| `unexpected argument '--sandbox' found` from `codex exec resume` | Put `--sandbox` before `resume`, as shown in [Continue a run](#continue-a-run). |
| `Not inside a trusted directory and --skip-git-repo-check was not specified.` | The directory isn't a Git repository, for example a folder under `/tmp`. Add `--skip-git-repo-check`. |
| `level "minimal" not supported` | Check the model's supported reasoning levels in the current model catalog, then set `-c model_reasoning_effort=<supported-level>`. |
| `The '<model>' model requires a newer version of Codex` | Update Codex, then check `codex --version`. |
| Warning: `Model metadata for '<model>' not found` | Check the exact model ID against the current catalog for the configured provider. An update may not fix it. |
| `usage limit`, `429 Too Many Requests`, `exceeded retry limit` | Read the underlying error. For an explicit usage-limit or exhausted-quota error, stop and tell the user. For a transient rate limit or connection failure, respect any retry delay and retry a bounded number of times with backoff. |
| `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`, and every command inside the run fails | The Linux sandbox can't start on this host. Ask the user before using `--dangerously-bypass-approvals-and-sandbox`. |
| `ERROR rmcp::transport::worker ... AuthRequired` in stderr | A configured MCP server requires authentication. Codex may continue without it. Check the exit status, events and final response, and authenticate the server if the task needs it. |
| `pgrep -f` finds unexpected processes, or a broad `pkill -f` stops the wrong run | Full-command matching can select unrelated runs and, on some systems, wrapper shells. Retain the caller's process or task handle. For a CLI process you backgrounded yourself, save `$!` immediately and use that PID instead of a pattern. |
| The calling tool returns a background-task handle instead of a result | The run may still be active. Retain the handle and use the caller's output or wait API. In Claude Code, start long runs with `run_in_background` and keep the returned task ID. |

If the calling shell is zsh, use `=` inside `[ ]`; `==` fails with `= not found`. Zsh does not split unquoted scalar variables into words by default, so store argument lists in arrays and expand them as `"${args[@]}"`.

If Codex still fails after a fix, report the error and ask the user before doing the work without Codex or with a different model.
