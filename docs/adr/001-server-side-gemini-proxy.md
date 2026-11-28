# ADR 001: Server-Side Gemini Proxy

- **Status**: Accepted

## Context

The frontend collects household profile attributes and air quality metrics to generate tailored smog guidance using `@google/genai`. Calling Gemini directly from the browser would embed or prompt for `GEMINI_API_KEY` client-side, exposing secrets and bypassing server-side validation, rate limiting, and response caching.

## Decision

All `@google/genai` SDK invocations run exclusively inside the Express backend (`POST /api/assistant/recommendations` in `server/routes/geminiHandler.ts`), reading `GEMINI_API_KEY` from startup-validated server config (`server/lib/config.ts`). The browser calls only same-origin `/api/*` endpoints.

## Consequences

- `GEMINI_API_KEY` never reaches the Vite client bundle, browser storage, HTTP responses, or structured server logs.
- Missing keys degrade cleanly to HTTP `503` without crashing startup.
- Server-side input sanitization, JSON body size limits (`16kb`), `415` media-type checks, rate limiting, and shared response caching apply uniformly before upstream quota is consumed.
