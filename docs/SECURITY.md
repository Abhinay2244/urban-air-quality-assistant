# Security Controls & Architecture

## 1. Key & Secret Handling (Server-Side Only)

- **Startup 12-Factor Validation (`server/lib/config.ts`)**: `loadServerConfig` reads `PORT`, `NODE_ENV`, `GEMINI_API_KEY`, and `AQI_API_KEY` once at startup into a frozen `ServerEnvConfig` object. Placeholder strings (`MY_GEMINI_API_KEY`, `MY_AQI_API_KEY` in `ENV_CONFIG`) and blank values normalize to `undefined`.
- **Zero Client Exposure**: `GEMINI_API_KEY` and `AQI_API_KEY` never enter the Vite bundle (`src/`), client HTTP responses, or query parameters returned to the browser. ESLint `no-restricted-imports` (`eslint.config.js`) and `src/tests/architecture.test.ts` prevent `src/` from importing `server/`.
- **Log Redaction (`server/lib/logger.ts`)**: Both API keys are registered via `registerSecretForRedaction`. Structured single-line JSON logs scrub registered key values, `AIza...` keys, `Bearer ...` headers, `?key=`/`&token=`/`&api_key=` query parameters, and sensitive object keys (`api_key`, `token`, `secret`, `password`, `authorization`, `cookie`), replacing them with `[REDACTED]`.
- **Safe Error Mapping (`server/lib/errorResponse.ts`)**: `sendErrorResponse` returns only `{ code, message }` (`AppError`), suppressing stack traces, internal error details, and missing-key diagnostics in HTTP responses (missing `GEMINI_API_KEY` returns `503 AI_SERVICE_BUSY` and logs a warning server-side).

## 2. Input Validation & Sanitization

All client and API boundaries validate structure, types, numeric ranges, and sanitized string length before downstream use:

- **Text Sanitization (`shared/utils/sanitizing.ts`)**: `sanitizeText` removes `<script>...</script>` and `<style>...</style>` blocks, strips HTML tags (`/<[^<>]*>/g`), removes ASCII control characters (`charCode < 32` or `127`), collapses whitespace, and slices to bounded maximums (`INPUT_LIMITS`: `80` chars for city names, `500` for general text, `400` for summary/priority fields, `350` for recommendation strings). `sanitizeAqiData` sanitizes city, country, station, warning, and timestamp strings before prompt assembly or caching.
- **Query & Route Validation**:
  - `GET /api/cities` (`server/routes/citiesHandler.ts`): sanitizes `q` and enforces length `2–80` (`ERROR_CODES.VALIDATION_ERROR` / `400` on invalid input).
  - `GET /api/aqi` (`server/routes/aqiHandler.ts`): sanitizes `city` (`2–80` chars) and validates optional `lat`/`lon` pairs strictly within finite `[-90, 90]` and `[-180, 180]`.
- **POST Body Validation (`server/routes/geminiHandler.ts`, `shared/utils/validation.ts`, `shared/utils/aqiValidation.ts`)**:
  - Rejects non-object bodies with `400`.
  - `validateUserProfile` verifies `familyType`, `commuteMode`, and `homeType` against strict TypeScript enums (`isOneOf`), verifies boolean sensitivity flags, and sanitizes/validates `city`.
  - `validateAqiData` enforces finite numeric metrics, valid `AqiCategoryId`, optional `provider` (`'waqi' | 'open-meteo'`), and valid `hourlyPm25` tuple structures.
  - Manual AQI fallback (`ManualAqiForm` / `aqiService.ts`) constrains user-entered AQI to `0–500`, optional PM2.5 to `0–1000`, and optional PM10 to `0–2000`.

## 3. Plain-Text Rendering of AI Output

- **Parse-Time Sanitization**: `parseAndValidateAssistantResponse` (`shared/utils/assistantParser.ts`) parses JSON via `JSON.parse` and passes `summary`, `priorityGuidance`, `title`, `action`, and `impactExplanation` through `sanitizeText`, dropping malformed items and falling back to `SAFE_FALLBACK_ASSISTANT_RESPONSE` when validation fails.
- **React Auto-Escaping Only**: UI components (`RecommendationCard.tsx`, `RecommendationList.tsx`, `ImpactSummary.tsx`, `AqiHeroCard.tsx`, `ErrorBanner.tsx`) render all telemetry and AI-generated strings strictly as React JSX text nodes. No component uses `dangerouslySetInnerHTML`, direct DOM `innerHTML`, `eval`, or raw HTML markdown rendering.

## 4. HTTP Security Headers & Request Hardening

Applied across the Express pipeline in `server/app.ts`, `server/middleware/securityMiddleware.ts`, and `server/middleware/httpHardeningMiddleware.ts` (constants in `shared/constants/server.ts`):

- **Fingerprint Removal**: `app.disable('x-powered-by')` removes Express server version headers.
- **Security Headers (`applySecurityHeaders`)**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()` (no geolocation or sensor access)
  - `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Resource-Policy: same-origin`
  - `X-DNS-Prefetch-Control: off`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (sent when `req.secure` is true, honoring `app.set('trust proxy', 1)`)
- **Content-Security-Policy**:
  - **Production (`PROD_CSP`)**: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'` (zero `'unsafe-inline'`, zero `'unsafe-eval'`).
  - **Development (`DEV_CSP`)**: allows `'unsafe-inline'` and `ws: wss:` strictly for Vite dev middleware.
- **CORS, Media-Type & Method Enforcement**:
  - `enforceSameOriginCors` sets `Vary: Origin`, rejects cross-origin `Origin` headers and HTTP scheme downgrades with `403 FORBIDDEN` (never `*`), and echoes only verified same-origin `Access-Control-Allow-Origin` (`GET, POST`, `Content-Type`), matching `Origin` host against `X-Forwarded-Host`/`Host` cleanly even when a TLS-terminating proxy forwards `X-Forwarded-Proto: http`.
  - `requireJsonContentType` enforces `application/json` on `POST /api/assistant/recommendations` (`415 UNSUPPORTED_MEDIA_TYPE` otherwise).
  - `rejectUnsupportedMethod` returns `405 METHOD_NOT_ALLOWED` with explicit `Allow` headers on disallowed HTTP verbs per route.
- **Request Correlation (`server/middleware/requestContext.ts`)**: Accepts or generates `x-request-id` (only alphanumeric/._- tokens up to `128` chars; invalid headers are replaced with a fresh `crypto.randomUUID()`).

## 5. Rate Limiting

`createApiRateLimiter` (`server/middleware/securityMiddleware.ts`) guards `/api/*`:

- **Window & Quota**: Fixed `60_000 ms` (`1`-minute) per-IP window (`RATE_LIMIT_CONFIG`), maximum `30` requests per IP (resolved via `req.ip` with `trust proxy = 1`, falling back to `req.socket.remoteAddress`).
- **Bounded Memory Protection**: Tracks up to `1000` IP keys (`MAX_TRACKED_IPS`). When full, expired entries are pruned first; if still full, the oldest tracked IP entry is evicted to prevent unbounded memory growth under traffic spikes.
- **Exceed Response**: Returns HTTP `429` (`RATE_LIMIT_EXCEEDED`) with an integer `Retry-After` header in seconds.

## 6. Body Size Limits & Timeouts

- **JSON Body Cap**: `express.json({ limit: '16kb' })` (`SERVER_CONFIG.JSON_BODY_LIMIT`). Oversized payloads return HTTP `413 PAYLOAD_TOO_LARGE` and malformed JSON returns HTTP `400 VALIDATION_ERROR` via `apiErrorMiddleware` (`server/app.ts`).
- **Bounded Execution Timeouts**:
  - Express HTTP socket/request timeout: `60_000 ms` (`server.ts` / `SERVER_CONFIG.REQUEST_TIMEOUT_MS`).
  - Gemini model chain total budget: `45_000 ms` (`20_000 ms` per-attempt timeout in `GEMINI_CONFIG`).
  - Upstream AQI / Open-Meteo provider timeout: `8_000 ms` (`SERVER_CONFIG.PROVIDER_TIMEOUT_MS`).

## Verification References

- Security headers, strict CSP, HSTS behind `trust proxy`, and per-IP rate limiting: `src/tests/server/security.test.ts`.
- `x-powered-by`, `415`, `405` + `Allow`, and same-origin CORS: `src/tests/server/httpHardening.test.ts`.
- `400` malformed JSON, `413` body limit, `404` unknown API routes, and secret redaction: `src/tests/server/app.test.ts`, `src/tests/server/logger.test.ts`, `src/tests/server/observability.test.ts`, `src/tests/server/config.test.ts`.
- Sanitization, HTML stripping, and coordinate/payload validation: `src/tests/utils/parserAndSanitizing.test.ts`, `src/tests/utils/validation.test.ts`, `src/tests/server/aqiHandler.test.ts`.
- Static dependency & secret isolation CI checks: `.github/workflows/ci.yml`, `.github/workflows/codeql.yml`, `src/tests/architecture.test.ts`.
