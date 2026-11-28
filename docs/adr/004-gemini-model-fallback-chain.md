# ADR 004: Gemini Model Fallback Chain and Response Cache

- **Status**: Accepted

## Context

Single-model Gemini deployments fail or stall when a specific model experiences transient `503`/`429` capacity spikes, deprecation/`404` availability mismatches, or slow tail latencies exceeding platform timeouts. Repeated identical queries within short periods also add avoidable latency and upstream API spend.

## Decision

Configure an ordered fallback chain in `GEMINI_MODEL_CHAIN` (`['gemini-4-hydrogen', 'gemini-3.1-flash-lite']`) paired with `ThinkingLevel.LOW` and bounded `maxOutputTokens: 4096`. Each model gets one `800 ms` delayed retry on `503`/`429` before advancing; per-attempt timeouts (`20 s`), `404`, and model-unavailable errors advance immediately, capped by a `45 s` total budget inside the `60 s` HTTP server timeout. All-busy exhaustion returns a distinct `503 AI_SERVICE_BUSY` JSON error. Validated non-fallback responses are stored in a bounded FIFO in-memory cache (`createRecommendationsCache`: `10`-minute TTL, max `100` entries, AQI bucket size `10`, keyed by sanitized cities, persona/sensitivities/commute/home, AQI bucket, and UTC hour).

## Consequences

- Typical plan latency stays low via `gemini-4-hydrogen` first, `ThinkingLevel.LOW`, and repeated identical hourly requests served from cache without consuming upstream quota.
- Fallback responses (`SAFE_FALLBACK_ASSISTANT_RESPONSE`) and errors are never cached, preventing degraded outputs from poisoning subsequent lookups.
- Server logs record per-model status, retry, fallback, and winning model alongside `x-request-id`.
