# AI Design & Safety Architecture

## 1. Where GenAI Is Used

Generative AI is used exclusively server-side on one endpoint: `POST /api/assistant/recommendations`.

- **Server entrypoint**: `server/routes/geminiHandler.ts` (`createAssistantRecommendationsHandler`) instantiates `GoogleGenAI` from `@google/genai` using `config.geminiApiKey` and delegates to `generateRecommendationsText`.
- **Client boundary**: `src/services/geminiService.ts` (`getAirQualityRecommendations`) posts validated `{ profile, aqiData }` JSON to `/api/assistant/recommendations`. No GenAI SDK or API key ever runs in or ships to the browser bundle (enforced by ESLint `no-restricted-imports` in `eslint.config.js` and `src/tests/architecture.test.ts`).
- **Non-AI pathways**: City autocomplete (`GET /api/cities`), live air quality lookups (`GET /api/aqi`), manual AQI entry (`createManualAqiData`), 24h **Today's plan** (`shared/utils/dailyPlan.ts`), **Best time for outdoor activity** (`shared/utils/outdoorWindow.ts`), and WHO/US EPA gauge classification (`src/utils/aqiCalculations.ts`) are 100% deterministic without model involvement.

## 2. Prompt Structure (System Instruction + JSON Schema)

Every Gemini invocation in `server/providers/geminiTransport.ts` (`invokeGeminiModel`) sets both a fixed system instruction and a strict response JSON schema:

- **System instruction (`ASSISTANT_SYSTEM_INSTRUCTION` in `shared/constants/prompts.ts`)**:
  - Roles the model as an urban air quality assistant for smog-prone Indian households.
  - Enforces **live data integrity**: US-scale AQI, PM2.5, PM10 (when provided), and hourly forecast slots are authoritative input; the model must never invent, guess, extrapolate, or fabricate AQI, PM2.5, or omitted PM10 numbers.
  - Requires coverage across all four `RecommendationCategory` sections (`DAILY_ROUTINE`, `INDOOR_AIR`, `SUSTAINABLE_ALTERNATIVE`, `HEALTH_ALERT`), max `3` items per section and `4–8` recommendations total.
  - Encodes persona cues (parents/children, older adults, working professionals, students) and Indian-home indoor hygiene (midday cross-ventilation windows, wet mopping over dry sweeping, room-sized HEPA CADR, houseplants noted strictly as a minor aid, and low-cost DIY box-fan MERV-13/HEPA or draft seals).
  - Caps copy length (`~8` words per title, `~25` words per action, 1 sentence per `impactExplanation`) and requires `estimatedPM25Reduction` (`0–100`).
- **JSON Schema (`ASSISTANT_RESPONSE_SCHEMA` in `server/providers/geminiSchema.ts`, field descriptions from `ASSISTANT_SCHEMA_DESCRIPTIONS`)**:
  - Top-level `OBJECT` requiring `summary`, `priorityGuidance`, and `recommendations` (`ARRAY`, `minItems: 1`, `maxItems: 8`).
  - Each item requires `title`, `category`, `action`, `impactExplanation` (`STRING`), and `estimatedPM25Reduction` (`NUMBER`).
  - Sent with `responseMimeType: 'application/json'`, `ThinkingLevel.LOW`, and `maxOutputTokens: 4096` (`GEMINI_CONFIG`).

## 3. Inputs (Profile + Live AQI + Forecast)

`buildAssistantPrompt(profile, aqiData)` in `shared/utils/promptBuilder.ts` builds the prompt string from server-validated (`validateUserProfile`, `validateAqiData`) and sanitized (`sanitizeAqiData`) inputs:

- **Location & Source**: Sanitized `city`, `country`, and source attribution (`live WAQI`, `live Open-Meteo`, or `manual entry`).
- **Authoritative Telemetry**: `Math.round(aqiData.aqi)` and `aqiData.category` on the US scale, plus `PM2.5`, `PM10` (or `PM10=not provided`), `NO2`, and `O3` in `ug/m3`.
- **Household Profile**: `familyType`, `hasChildren`, `hasElderly`, `hasRespiratoryCondition`, `commuteMode`, `homeType`, plus optional targeted `Persona Focus` instructions for parents, seniors, working professionals, or students.
- **24-Hour Forecast Summary**: When `aqiData.hourlyPm25` is present, `buildDailyPlanSlots(hourlyPm25)` summarizes **Morning**, **Afternoon**, and **Evening** PM2.5 averages/actions and `findBestOutdoorWindow(hourlyPm25, 2)` supplies the cleanest 2-hour outdoor window so `DAILY_ROUTINE` timing aligns directly with the forecast cards.

## 4. Validation & Safe Fallback

Model responses are untrusted until parsed and sanitized by `parseAndValidateAssistantResponse(rawText)` in `shared/utils/assistantParser.ts` (executed both server-side before caching and client-side in `src/services/geminiService.ts`):

1. Trims `rawText` and parses JSON safely (`try/catch`).
2. Sanitizes `summary` and `priorityGuidance` via `sanitizeText(..., 400)` and each recommendation's `title`, `action`, and `impactExplanation` via `sanitizeText(..., 350)` (`INPUT_LIMITS`), stripping HTML tags, `<script>`/`<style>` blocks, and ASCII control characters.
3. Validates `category` against `RecommendationCategory` (defaulting unknown values to `DAILY_ROUTINE`), clamps/rounds `estimatedPM25Reduction` to `[0, 100]`, filters out items missing required text fields, and caps the list at `INPUT_LIMITS.MAX_RECOMMENDATIONS` (`8`).
4. If JSON fails to parse or lacks a non-empty `summary`, `priorityGuidance`, or at least `1` valid recommendation, returns `SAFE_FALLBACK_ASSISTANT_RESPONSE` (`shared/constants/prompts.ts`, marked `isFallback: true`) with 4 pre-validated protective actions across all four categories.

## 5. Deterministic Post-Model Rule Layer

Every validated `AssistantResponse` (including `SAFE_FALLBACK_ASSISTANT_RESPONSE`) passes through `applyUrgencyRules(response, profile, aqiData)` in `src/utils/urgencyRules.ts` (invoked by `src/hooks/assistantRunner.ts`):

- **Urgency scoring (`scoreUrgency`)**: Evaluates `aqiData.aqi` against `AQI_THRESHOLDS` (US EPA scale). At `AQI >= 151` (`UNHEALTHY`), `HEALTH_ALERT` and `INDOOR_AIR` items become `CRITICAL` (all others `HIGH`). At `AQI >= 101` (`UNHEALTHY_SENSITIVE`) when `hasChildren || hasElderly || hasRespiratoryCondition` is true, `HEALTH_ALERT` becomes `CRITICAL` (others `HIGH`). At `AQI >= 51`, `HEALTH_ALERT` is at least `HIGH`.
- **Mandatory health alert injection**: If severe alert thresholds trigger (`101+` sensitive or `151+` universal) and no `HEALTH_ALERT` item mentions `"n95"`, or if a vulnerable household has zero `HEALTH_ALERT` items, prepends `SEVERE_ALERT_TEMPLATE` naming the affected household groups and current AQI (`"Stay Indoors and Wear a Fitted N95 Mask"`).
- **Context rule injection**: Appends one deterministic household/commute rule from `CONTEXT_RULE_TEMPLATES` (`WALK_OR_BIKE` pause alert, `COMPACT_HOUSING` draft-sealing rule for apartments/shared housing, or `DEFAULT_ECO_TRIP`) if not already present.
- **Deterministic priority & ordering**: Sorts recommendations descending by `CRITICAL > HIGH > STANDARD` regardless of model order, and overrides `priorityGuidance` at severe thresholds (`SEVERE_PRIORITY_TEMPLATE`).

## 6. Model Fallback Chain & Retries

`generateRecommendationsText` (`server/routes/geminiHandler.ts`), `runSingleModelWithRetry` (`server/providers/geminiChain.ts`), and `invokeGeminiModel` (`server/providers/geminiTransport.ts`) execute the chain defined in `GEMINI_MODEL_CHAIN` (`shared/constants/server.ts`):

1. **Ordered chain**: `['gemini-4-hydrogen', 'gemini-3.1-flash-lite']`.
2. **Budgets**: `ThinkingLevel.LOW`, `maxOutputTokens: 4096`, `PER_ATTEMPT_TIMEOUT_MS: 20_000 ms`, `TOTAL_TIMEOUT_MS: 45_000 ms` (nested inside Express `REQUEST_TIMEOUT_MS: 60_000 ms`).
3. **Retry vs. immediate skip (`classifyGeminiChainError` in `server/providers/geminiErrors.ts`)**:
   - **Busy / rate-limited (`503`, `429`, `UNAVAILABLE`, `RESOURCE_EXHAUSTED`, overloaded)**: waits `RETRY_DELAY_MS` (`800 ms`, abortable if the 45 s total timer fires), retries that same model once, then advances to the next model if the second attempt fails.
   - **Skip (`TimeoutError`, `404`, `NOT_FOUND`, unsupported model)**: advances immediately to the next model without sleeping `800 ms`.
   - **Client/auth failures (`400`, `403`, `API_KEY_INVALID`)**: thrown immediately without fallback.
   - **All models busy**: throws `GeminiBusyError`, mapped by `mapGeminiUpstreamError` (`server/lib/errorResponse.ts`) to HTTP `503` (`"The AI service is busy. Please try again in a moment."`).
4. **Structured logging**: `logger` records recoverable per-model deferrals (`status`, `reason`), retries (`attempt: 2`), fallback transitions (`reason: 'skip' | 'retry_exhausted'`), and the answering model to `stdout` alongside `x-request-id`, reserving `stderr` error logs for terminal chain failures.

## 7. Bounded Response Cache

`createRecommendationsCache` and `buildRecommendationsCacheKey` in `server/providers/geminiCache.ts` reduce latency and upstream Gemini usage (`GEMINI_CACHE_CONFIG`):

- **Capacity & TTL**: Max `100` entries (`MAX_ENTRIES`), `10`-minute TTL (`TTL_MS = 600_000 ms`), FIFO eviction after pruning expired entries.
- **Cache key tuple**: `[safeProfileCity, safeAqiCity, familyType, hasChildren, hasElderly, hasRespiratoryCondition, commuteMode, homeType, roundedAqi, utcDateHour]` where `roundedAqi` rounds AQI to the nearest `10` (`AQI_BUCKET_SIZE: 10`) and `utcDateHour` is `YYYY-MM-DDTHH`.
- **Caching policy**: Only validated non-fallback model outputs (`!parseAndValidateAssistantResponse(rawText).isFallback`) are stored (`server/routes/geminiHandler.ts`). Errors and `SAFE_FALLBACK_ASSISTANT_RESPONSE` outputs are never cached.

## 8. Guarantee: AQI Values Are Never Generated by the Model

Numeric AQI, pollutant concentrations, station metadata, and hourly forecasts always originate from telemetry (`GET /api/aqi` via WAQI / Open-Meteo) or explicit user entry (`ManualAqiForm`), never from Gemini:

- **Schema & Type Separation**: `AssistantResponse` (`shared/types/index.ts`) holds only `{ summary, priorityGuidance, recommendations, isFallback }`. No `aqi`, `pm25`, `pm10`, or `stationName` field exists in `ASSISTANT_RESPONSE_SCHEMA` or `parseAndValidateAssistantResponse`.
- **Execution Order**: `useAssistantExecution` (`src/hooks/useAssistantExecution.ts`) stores `aqiData` via `onResolvedAqi` _after_ `resolveAqiStep` succeeds and _before_ calling `getAirQualityRecommendations`. Telemetry displayed by `AqiHeroCard`, `AqiGauge`, `TodaysPlanCard`, and `OutdoorWindowCard` never depends on `assistantResponse`.
- **Above-500 Preservation**: `validateAqiData` (`shared/utils/aqiValidation.ts`) accepts finite live readings above `500`, and `AqiHeroCard`/`AqiGauge` display them verbatim as `Hazardous` with an `"above scale"` badge.

### Tests Proving Telemetry Integrity, Validation, Fallback & Caching

- `src/tests/features/Accessibility.test.tsx`:
  - `"passes axe in results state and preserves provider AQI over model-generated text"` — injects a mocked Gemini response whose `summary` falsely claims AQI is `15 Good` while live `/api/aqi` returns `215`; asserts `AqiGauge` renders `AQI (US scale) 215: Very Unhealthy` and never `15`.
  - `"states value, category, and US scale on AqiGauge for standard and above-scale values"` — verifies `620` renders as `AQI (US scale) 620 (above scale): Hazardous`.
- `src/tests/server/aqiHandler.test.ts`:
  - `"queries WAQI geo feed for selected city coordinates, accepts AQI > 500, and attaches Open-Meteo hourlyPm25"`.
  - `"falls back to Open-Meteo, warns when outside India, and handles 404 city not found"`.
- `src/tests/services/aqiService.test.ts`: verifies `/api/aqi` response normalization and manual `AqiData` construction via `createManualAqiData`.
- `src/tests/utils/parserAndSanitizing.test.ts`: verifies malformed/insufficient Gemini JSON falls back to `SAFE_FALLBACK_ASSISTANT_RESPONSE` and `sanitizeAqiData` sanitizes station/warning metadata safely.
- `src/tests/utils/urgencyRules.test.ts`: verifies `101+` sensitive and `151+` universal critical alert injection, sorting, and priority guidance overrides.
- `src/tests/server/geminiFallback.test.ts`, `src/tests/server/geminiCache.test.ts`, `src/tests/server/geminiErrorsAndCache.test.ts`: prove ordered model fallback, `503`/`429` retry, `404`/timeout immediate skip, `ThinkingLevel.LOW` + `4096` config, cache key isolation, FIFO/TTL eviction, and exclusion of fallback/error responses from cache.
- `src/tests/architecture.test.ts`: verifies zero cross-layer violations and zero circular imports across `shared/`, `src/`, `server/`, and `server.ts`.
