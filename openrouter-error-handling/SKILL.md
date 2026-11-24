---
name: openrouter-error-handling
description: Apply the local OpenRouter error policy when writing or reviewing API clients, streams, or background jobs. Covers error classification, retries, model fallback, and safe client errors.
---

# OpenRouter error handling

Check the wire format for the endpoint and how the installed SDK exposes errors, headers, and terminal events. Apply the local retry and reporting rules below at the application boundary. [OpenRouter errors](https://openrouter.ai/docs/api_reference/errors-and-debugging) · [OpenRouter streaming](https://openrouter.ai/docs/api_reference/streaming)

## Detect and classify

Check non-2xx responses and error payloads even on HTTP 200. The upstream can send headers before it generates any output. Read the final outcome through the SDK or parse server-sent events with a compliant parser that handles comments, multiline data, and events split across reads.

Use these fields to detect failures and verify how a stream ended.

| API | Failure and canonical `error_type` | Stream completion |
| --- | --- | --- |
| Chat Completions | Check top-level `error`, each `choices[].error`, and `finish_reason: "error"`. The canonical type is `metadata.error_type` in the error object. | Read the final choice reasons and `[DONE]`, or the SDK's equivalent. |
| Responses | Check the response's `error` and `status: "failed"`, plus `response.failed` and `error` stream events. The canonical type is `error_type` on the response object, including `response.error_type` in `response.failed`. A plain `error` event can carry a native `code` directly. | `response.completed` confirms completion. `response.incomplete` carries an incomplete result. |
| Anthropic Messages | Check the error envelope and SSE `error` event. The canonical type is `error.error_type`. | Read the `stop_reason` and `message_stop`, or the SDK's equivalent. |

Prefer a recognized canonical `error_type`. If it is absent, unknown, or `unmapped`, use the documented native code, embedded numeric error status, or HTTP status. Never classify by message text or `remedy_hint`. Use `availability.code`, `availability.retryable`, and `availability.retry_after` only where the endpoint or application contract defines them. Handle additional error events exposed by the installed SDK, such as `response.error` where applicable.

Treat malformed data and a disconnect before the terminal signal as failures. A terminal marker cannot erase a prior error. Inspect refusal or content-filter results, output-limit truncation, tool calls, and other requested output types before classifying a result as empty. Preserve truncated or refused results according to the caller's contract. Skip an identical retry for those outcomes.

## Retry policy

- Fail fast on authentication (`401`), billing (`402`), permission or policy (`403`), request or configuration errors, and documented non-retryable availability failures. Apply this rule to both HTTP status and structured in-band failures. A `503` can also mean no provider matches the routing constraints. Keep the constraints and use any documented reason to distinguish that case from transient overload.
- Give operators a safe action for each cause. Check `OPENROUTER_API_KEY` when the application uses it and OpenRouter rejects that credential. For billing, read `error.metadata.limit_source` when present to distinguish key limits, credits, and an exhausted in-flight budget. OpenRouter can send `Retry-After` for `openrouter_in_flight_budget`. Local policy still fails fast on that `402`. [OpenRouter credit and rate limits](https://openrouter.ai/docs/api_reference/limits#handling-402-errors)
- Retry transient rate limits, provider overload or unavailability, timeouts, server failures, and temporary connection failures. Use HTTP `408`, `429`, or `5xx` as a fallback when no more specific classification applies. An unexplained empty result can use the same budget if the operation is safe to retry.
- Set one attempt limit and one deadline across SDK, application, and job retries. Configure SDK retries to fit the same policy, or disable them when the application retries. For eligible failures, honor a valid `Retry-After` or another documented retry delay. Otherwise use capped exponential backoff with jitter. Stop if the delay would consume the remaining budget. Propagate cancellation to the active request and any retry wait.
- After partial output, tool calls, or possible side effects, report the failure. Replay only when the operation is explicitly idempotent and the caller can resume or deduplicate safely.

## Fallback and reporting

Same-model provider failover is allowed within the configured routing constraints. Cross-model fallback requires product opt-in, including fallback configured through presets, SDKs, or job retries. OpenRouter's `models` and Anthropic Messages `fallbacks` can also switch models after moderation and context-length errors. Check that this behavior fits the approved policy before enabling either. When fallback is enabled, validate that the returned model is approved and record the actual model and provider when available. [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection) · [Model fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks)

Map upstream service failures to HTTP `503` with a sanitized reason while the application's downstream headers are still writable. After the application sends them, use its terminal stream error format. Preserve the internal cause and retry decision in jobs and callbacks so a queue does not replay a permanent failure.

Log allowlisted fields such as the upstream status, error category, documented availability code or `limit_source`, model, provider, attempt count, and request or generation ID. Keep credentials, prompts, raw provider payloads, debug echoes, and exception strings out of client errors and routine logs.
