# Architecture

## Layer Stack

`UI (App / features / components)` -> `hooks` -> `services` -> `server`

- **UI (`src/App.tsx`, `src/main.tsx`, `src/features/`, `src/components/`)**: Root `ErrorBoundary` wraps `App`, which renders accessible forms, India-only city search suggestions (`LocationCard`), US-scale AQI gauge cards (`AqiHeroCard`), hourly **Today's plan** (`TodaysPlanCard`) and **Best time for outdoor activity** (`OutdoorWindowCard`), manual entry (`ManualAqiForm`), 5-second slow-loading skeleton notice (`LoadingSkeleton`), and 4-section recommendation cards (`RecommendationList`, `RecommendationCard`, `WhyThesePanel`). Reads state and callbacks exclusively from hooks.
- **Hooks (`src/hooks/`, `src/features/profile/useCityAutocomplete.ts`)**: Orchestrate profile validation (`useProfile`), submit cooldown timers (`useCooldown`), debounced India-only city search (`useCityAutocomplete`), and AQI/AI request lifecycles with `AbortController` cancellation and mode-preserving retry (`useAssistant`).
- **Services (`src/services/`)**: Client-side HTTP boundary (`httpClient`, `aqiService`, `citySearchService`, `geminiService`) responsible for `fetch` execution with `AbortSignal`, runtime payload type guards, and mapping network errors to `AppError`.
- **Server (`server.ts`, `server/`)**: Express application (`createApp()` with `60_000 ms` server request timeout) reading startup-validated 12-factor config (`config`), emitting redacted structured JSON logs (`logger`) with `x-request-id` correlation (`requestContext`), serving `GET /api/health` (`healthHandler`), security headers, per-IP rate limiting, request validation, India-only city geocoding (`citiesHandler`), WAQI/Open-Meteo AQI & hourly PM2.5 lookups (`aqiHandler`, `waqiProvider`, `aqiProviders`, `hourlyForecastProvider`), bounded FIFO recommendation caching (`geminiCache`), and ordered `@google/genai` calls (`geminiHandler`, `geminiTransport`, `geminiSchema`, `geminiErrors`).

## Data Flow

1. User edits household inputs or types an Indian city in `ProfileForm` / `LocationCard`; `useProfile` validates live via `utils/validation.ts`, while `useCityAutocomplete` debounces (`250 ms`) queries to `GET /api/cities?q=...` (Open-Meteo Geocoding with `countryCode=IN`) and aborts stale requests.
2. Submitting invokes `useAssistant.requestRecommendations`, aborting any prior in-flight `AbortController` and passing the new `AbortSignal` into `fetchAqiDataByCity` (`GET /api/aqi?city=...` with optional `lat`/`lon` when chosen from Indian city suggestions).
3. On the server, `handleLiveAqiLookup` queries WAQI (if `AQI_API_KEY` is configured) plus Open-Meteo 24h hourly PM2.5, or falls back to Open-Meteo Air Quality (`us_aqi`, `pm2_5`, `pm10`, `nitrogen_dioxide`, `ozone`, `hourly=pm2_5`), attaching a `locationWarning` if the resolved station is outside India or farther than `50 km`.
4. If live AQI lookup fails, `isAqiUnavailable` reveals `ManualAqiForm`, which builds validated `AqiData` (`source: 'manual'`) via `createManualAqiData` with required AQI (`0–500`) and optional PM2.5/PM10.
5. Validated `UserProfile` + `AqiData` are posted to `POST /api/assistant/recommendations`. `createAssistantRecommendationsHandler` sanitizes inputs, builds a deterministic cache key (`buildRecommendationsCacheKey`: sanitized city names, profile persona/sensitivities/commute/home, AQI rounded to nearest `10`, UTC `YYYY-MM-DDTHH`), and returns cached JSON on hit (`10`-minute TTL, max `100` entries, FIFO eviction).
6. On cache miss, `generateRecommendationsText` tries `GEMINI_MODEL_CHAIN` (`['gemini-4-hydrogen', 'gemini-3.1-flash-lite']`) with `ThinkingLevel.LOW`, `maxOutputTokens: 4096`, `20_000 ms` per-attempt timeout, `45_000 ms` total timeout budget, and one `800 ms` retry on `503`/`429` (immediate skip to next model on timeout, `404`, or model-unavailable). Validated non-fallback responses (`!isFallback`) are stored in the cache; errors and fallback responses are never cached.
7. Client `parseAndValidateAssistantResponse` validates model JSON (falling back safely to `SAFE_FALLBACK_ASSISTANT_RESPONSE` on parse failure), and `applyUrgencyRules` deterministically ranks health alerts (`101+` for sensitive households, `151+` for all households) and context rules before UI rendering.

## Error Contract

All API errors and client service failures conform to `{ code, message }` (typed as `AppError` with `ErrorCode` from `src/constants/http.ts`):

- Client validation failures produce `VALIDATION_ERROR` inline before network requests.
- Server error responses use `server/errorResponse.ts` (`sendErrorResponse`), returning structured JSON with no stack traces, HTML pages, or secrets (`503 AI_SERVICE_BUSY` if every Gemini model fails with `503`/`429`).
- `AbortError` cancellations are rethrown silently by services and ignored in `useAssistant` and `useCityAutocomplete`.

## Dependency Rules

- `src/types/` imports only `src/constants/http.ts` (`ERROR_CODES`).
- `src/constants/` imports only `src/types/` and sibling constants (never `@google/genai`).
- `src/utils/` imports only `src/constants/`, `src/types/`, and sibling utilities.
- `src/services/` imports `src/constants/`, `src/types/`, and `src/utils/`.
- `src/hooks/` imports `src/constants/`, `src/types/`, `src/utils/`, and `src/services/`.
- `src/components/` and `src/features/` **never** import `src/services/` or `server/` (with `useCityAutocomplete` colocated under `src/features/profile/` calling `citySearchService`).
- `server/` imports only Express/Node/`@google/genai` modules, `src/constants/`, `src/types/`, and `src/utils/` (no circular imports).
