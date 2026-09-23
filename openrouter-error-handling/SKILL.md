---
name: openrouter-error-handling
description: Apply the local error-handling policy when writing or reviewing code that calls OpenRouter, including streaming failures, retries, model fallback, and safe client errors.
---

# OpenRouter error handling

Apply this local policy across HTTP clients, SDKs, streams, and background jobs. Check the [OpenRouter error documentation](https://openrouter.ai/docs/api_reference/errors-and-debugging) for the endpoint and SDK being used; protocol details below were checked on 2026-09-23.

## Detect and classify

Check non-2xx responses, HTTP-200 error bodies, choice-level errors, and SSE errors. Treat malformed bodies and interrupted streams as failures; require the endpoint's normal completion signal before reporting success.

Prefer canonical `error_type` over lossy native codes or HTTP status. Its location depends on the API:

| API | Canonical field |
| --- | --- |
| Chat Completions | `error.metadata.error_type`, including inside a failed choice |
| Responses | `error_type` on the response object; `response.error_type` in `response.failed` events |
| Anthropic Messages | `error.error_type` |

Also handle Responses `response.error` and `error` events. If canonical fields are absent, use documented native codes, embedded numeric error status, or HTTP status. Never classify by message text. Only use `availability.code`, `availability.retryable`, or `availability.retry_after` when the current endpoint or application contract defines them; do not assume they are universal OpenRouter fields.

## Retry policy

- Fail fast on authentication (`401`), billing (`402`), permission or policy (`403`), and request/configuration errors. Keep distinct internal errors: identify `OPENROUTER_API_KEY` for credential failures, credit/limit action for billing, and a safe reason for permission or policy failures. A 403 is not an invalid key.
- Fail fast on documented non-retryable availability failures, even when their HTTP status is 5xx. A retry hint does not override the local 401/402/403 rule.
- Retry transient rate limits, provider overload/unavailability, timeouts, server failures, and temporary connection failures. Use HTTP 408/429/5xx as a fallback when no more specific classification is available.
- Honor valid retry delays within the total deadline; otherwise use exponential backoff with jitter. Bound attempts and elapsed time, including SDK retries. If the delay exceeds the remaining budget, return the failure. Respect cancellation.
- Empty text alone is not a retry signal: inspect tool calls, refusal content, and token-limit termination first. Retry an unexplained empty result only before output or side effects, within the same budget.
- After partial output, tool calls, or side effects, surface the failure. Replay only with an explicitly idempotent operation and a safe resume or deduplication strategy.

## Fallback and reporting

Same-model provider failover is allowed. Cross-model fallback requires product opt-in: do not add `models`/`fallbacks` lists or adopt suggested fallback models silently. When enabled, validate the returned model and record the actual model/provider when available. See [model fallback behavior](https://openrouter.ai/docs/guides/routing/model-fallbacks).

Map upstream service failures to HTTP 503 with a sanitized reason. Once response headers have been sent, report a sanitized terminal stream error instead. Background jobs and callbacks must preserve the same classification. Keep the internal cause distinct from the public status; do not expose raw provider payloads or exception strings.

Log status, error category, documented availability code, model/provider, attempt count, and request/generation ID when available. Exclude credentials, prompts, and raw provider metadata.
