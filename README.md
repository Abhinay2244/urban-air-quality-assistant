# Urban Air Quality Assistant

A GenAI-powered web application that helps urban households across India navigate winter smog and particulate pollution with practical, low-emission daily routines, indoor air hacks, sustainable alternatives, and household-specific health alerts.

## Chosen Vertical

**Challenge 6 — Urban Air Quality Assistant**: Built for households and individuals in smog-prone Indian cities (including Delhi, Noida, Mumbai, Kolkata, Lucknow, and Hyderabad), covering parents with children, seniors, working professionals, student athletes, people with respiratory sensitivities, and active or remote households.

## Approach & Logic

1. **Location & Profile Resolution**: `useProfile` validates household attributes (`familyType` including `Working professional` and `Student`, sensitivity flags for children, older adults, and respiratory conditions, `commuteMode`, and `homeType`). `LocationCard` offers **India-only city search with autocomplete** (`GET /api/cities?q=...` powered by Open-Meteo Geocoding with `countryCode=IN`, debounced at `250 ms` with `AbortController` cancellation) alongside direct Indian city entry.
2. **Live AQI Proxy & Integrity**: `GET /api/aqi` validates the city name (and optional `lat`/`lon` coordinates supplied when selecting an Indian city suggestion), queries **WAQI** when `AQI_API_KEY` is configured while enriching with Open-Meteo 24-hour hourly PM2.5 (`hourly=pm2_5`), or falls back directly to **Open-Meteo Air Quality** (`us_aqi`, `pm2_5`, `pm10`, `nitrogen_dioxide`, `ozone`, `hourly=pm2_5`). Raw live AQI readings above `500` are preserved without rejection, classified as **Hazardous**, and tagged `"above scale"`. Stations outside India (`INDIA_GEO_BOUNDS`) or farther than `50 km` (`MAX_STATION_DISTANCE_KM`) trigger a visible warning banner. If live lookup fails or the user switches manually, `ManualAqiForm` accepts AQI (`0–500`) plus optional PM2.5 (`0–1000 ug/m3`) and PM10 (`0–2000 ug/m3`) and labels the output `"Manual entry"`.
3. **Structured Gemini Chain & Response Cache**: `POST /api/assistant/recommendations` validates the `UserProfile` and `AqiData` payloads, sanitizes AQI fields, and checks a bounded FIFO in-memory response cache (`server/geminiCache.ts`: max `100` entries, `10`-minute TTL, keyed by sanitized city names, persona/sensitivity/commute/home fields, AQI rounded to the nearest `10`, and current UTC date+hour). On cache miss, `server/geminiHandler.ts` sends a deterministic prompt (`buildAssistantPrompt`, including Morning/Afternoon/Evening slots from **Today's plan**) to `GEMINI_MODEL_CHAIN` (`gemini-3.5-flash` -> `gemini-3.6-flash` -> `gemini-3.7-flash` -> `gemini-3.5-flash-lite`) using `ThinkingLevel.LOW`, `maxOutputTokens: 2048`, a `20 s` per-attempt timeout, and a `45 s` total budget (inside the `60 s` HTTP server timeout). On `503` or `429`, it retries that model once after `800 ms` before advancing; on per-attempt timeout, `404`, or model-unavailable errors, it advances immediately; if every model fails with `503`/`429`, it returns HTTP `503` (`"The AI service is busy. Please try again in a moment."`). Only validated non-fallback responses (`!isFallback`) are cached.
4. **Deterministic US EPA Urgency Layer**: `parseAndValidateAssistantResponse` validates model JSON (falling back to `SAFE_FALLBACK_ASSISTANT_RESPONSE` if invalid/unparseable), and `applyUrgencyRules` evaluates readings on the **AQI (US scale, as reported by WAQI and Open-Meteo)**: stay-indoors + fitted N95/KF94 `HEALTH_ALERT` priority starts at **101** (`Unhealthy for Sensitive Groups`) for households with children, older adults, or respiratory sensitivities, and at **151** (`Unhealthy`) for all households.

```mermaid
flowchart LR
  A[Profile + India City Search] --> B{Live AQI Lookup<br/>/api/aqi}
  B -->|WAQI / Open-Meteo OK| D[Validated US-Scale AqiData + Station + 24h PM2.5]
  B -->|Unavailable| C[ManualAqiForm Fallback<br/>Manual entry]
  C --> D
  D --> E{Gemini Cache Hit?<br/>TTL 10m / Max 100}
  E -->|Hit| G[parseAndValidateAssistantResponse]
  E -->|Miss| F[Gemini Model Chain<br/>3.5-flash -> 3.6-flash -> 3.7-flash -> 3.5-flash-lite]
  F -->|Valid Non-Fallback JSON| H[Store in Cache]
  H --> G
  F -->|Invalid / Unparseable| I[SAFE_FALLBACK_ASSISTANT_RESPONSE]
  G --> J[applyUrgencyRules]
  I --> J
  J --> K[ImpactSummary + Today's Plan + 4-Section Plan]
```

## Features

- **US EPA AQI Gauge & Station Transparency**: Circular gauge colored by **AQI (US scale, as reported by WAQI and Open-Meteo)** (`Good` 0–50, `Moderate` 51–100, `Unhealthy for Sensitive Groups` 101–150, `Unhealthy` 151–200, `Very Unhealthy` 201–300, `Hazardous` 301–500, plus `>500` live readings treated as Hazardous with an `"above scale"` badge). Displays the city/country headline, distinct monitoring `Station` name when available, formatted timestamp (`updatedAt`), source badge (`Live WAQI`, `Live Open-Meteo`, `Live reading`, or `Manual entry`), and any non-India / `>50 km` distance warning.
- **PM2.5 & PM10 vs. WHO 24h Guidelines**: Displays PM2.5 alongside the `15.0 ug/m3` WHO 24h guideline and PM10 (or `N/A` when omitted) alongside the `45.0 ug/m3` WHO 24h guideline, with optional manual PM2.5 and PM10 inputs.
- **Today's Plan & Best Outdoor Window**: When hourly PM2.5 data is present, renders **Today's plan** (**Morning** `6 AM – 12 PM`, **Afternoon** `12 PM – 5 PM`, **Evening** `5 PM – 10 PM`) with expected PM2.5 and tailored action alongside the **Best time for outdoor activity** 2-hour window, and passes those slots to Gemini.
- **India-Only City Search**: Autocomplete powered by Open-Meteo Geocoding (`countryCode=IN`), supporting Indian metros and towns while passing resolved coordinates to `/api/aqi`.
- **Personas & Indian-Home Guidance**: Tailored for parents with children, seniors, working professionals, and **Student** outdoor sports/activity planning, plus wet mopping, clean-window ventilation timing, room-sized HEPA CADR, minor houseplant caveat, and low-cost DIY options. Shows a slow-loading notice (`"Generating your plan, this can take up to 40 seconds"`) after `5` seconds of loading. See `docs/SAMPLE_INPUTS.md` for all six quick-select walkthrough scenarios.

## Architecture & Folder Structure

- `server.ts` & `server/` — Express entry point (`60 s` server request timeout) plus modular route handlers (`aqiHandler.ts`, `citiesHandler.ts`, `geminiHandler.ts`), provider clients (`waqiProvider.ts`, `aqiProviders.ts`, `hourlyForecastProvider.ts`), Gemini transport/schema/cache/errors (`geminiTransport.ts`, `geminiSchema.ts`, `geminiCache.ts`, `geminiErrors.ts`), error mapper (`errorResponse.ts`), security middleware (`securityMiddleware.ts`), and app wiring (`app.ts`).
- `src/components/` — Presentational UI primitives (`AppChrome`, `AqiGauge`, `ChipToggle`, `EmptyIllustration`, `ErrorBanner`, `Icons`, `LoadingSkeleton`, `ProfileIcons`, `ProgressBar`, `SectionCard`, `SectionCategoryIcon`, `SegmentedControl`, `SensitivityIcon`, `SeverityBadge`, `ThemeToggle`).
- `src/constants/` — Split by concern: numeric bounds & timers (`limits.ts`), HTTP/error contract (`http.ts`), server/cache/Gemini config (`server.ts`), US EPA AQI tiers/WHO guidelines/India bounds (`aqi.ts`), daily plan slots (`dailyPlan.ts`), urgency templates (`urgencyTemplates.ts`), Gemini prompts (`prompts.ts`), UI tokens (`uiTheme.ts`), 6 sample profiles (`samples.ts`), and app labels (`config.ts`).
- `src/features/` — `profile/` (`ProfileForm`, `LocationCard`, `profileFields`, `useCityAutocomplete`), `impact/` (`AqiHeroCard`, `ImpactSummary`, `ManualAqiForm`, `ManualMetricField`, `OutdoorWindowCard`, `TodaysPlanCard`), and `assistant/` (`EmptyRecommendationsState`, `RecommendationCard`, `RecommendationList`, `WhyThesePanel`).
- `src/hooks/` — State orchestration (`useProfile`, `useCooldown`, `useAssistant`) with `AbortController` request cancellation, submit cooldown notice, and mode-preserving retry.
- `src/services/` — Typed browser API clients (`aqiService.ts`, `citySearchService.ts`, `geminiService.ts`, `httpClient.ts`).
- `src/utils/` — Pure helpers (`aqiCalculations.ts`, `dailyPlan.ts`, `errors.ts`, `outdoorWindow.ts`, `locationValidation.ts`, `urgencyRules.ts`, `validation.ts`, `promptBuilder.ts`, `assistantParser.ts`, `formatting.ts`, `sanitizing.ts`, `typeGuards.ts`).
- `docs/` — `ARCHITECTURE.md` and `SAMPLE_INPUTS.md`.

## Security

- **Zero Client Secrets**: `GEMINI_API_KEY` and optional `AQI_API_KEY` remain exclusively in server `process.env` and are never bundled, logged, or returned in responses.
- **HTTP Headers & Rate Limiting**: `applySecurityHeaders` configures `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, and CSP headers (`connect-src 'self'` in production). `trust proxy = 1` and bounded per-IP rate limiting (`30` requests/minute, max `1000` tracked IPs) protect `/api/*` alongside a `16kb` JSON body cap.
- **Boundary Validation**: Coordinates (`[-90, 90]`, `[-180, 180]`), city text sanitization (`sanitizeText`), runtime type guards, manual AQI (`0–500`) / PM2.5 (`0–1000`) / PM10 (`0–2000`) bounds, and plain-text React rendering prevent injection and malformed payloads.

## Testing

The `src/tests/` suite runs on **Vitest**, **@testing-library/react**, and **@testing-library/jest-dom** (`jsdom`, setup in `src/tests/setup.ts`) across **33 test files (94 tests)**:

- `src/tests/components/` (`4` files): `ErrorBanner.test.tsx`, `LoadingSkeleton.test.tsx`, `ProgressBar.test.tsx`, `ThemeToggle.test.tsx`
- `src/tests/constants/` (`1` file): `aqi.test.ts`
- `src/tests/features/` (`6` files): `App.test.tsx`, `AssistantErrors.test.tsx`, `ImpactSummary.test.tsx`, `ManualAqiForm.test.tsx`, `ProfileForm.test.tsx`, `RecommendationCard.test.tsx`
- `src/tests/hooks/` (`5` files): `useAssistant.test.ts`, `useAssistantCancellation.test.ts`, `useCityAutocomplete.test.ts`, `useCooldown.test.ts`, `useProfile.test.ts`
- `src/tests/server/` (`7` files): `app.test.ts`, `aqiHandler.test.ts`, `citiesHandler.test.ts`, `geminiCache.test.ts`, `geminiFallback.test.ts`, `handlers.test.ts`, `security.test.ts`
- `src/tests/services/` (`2` files): `aqiService.test.ts`, `geminiService.test.ts`
- `src/tests/utils/` (`8` files): `aqiCalculations.test.ts`, `dailyPlan.test.ts`, `errors.test.ts`, `formatting.test.ts`, `locationValidation.test.ts`, `outdoorWindow.test.ts`, `urgencyRules.test.ts`, `validation.test.ts`
- Shared helpers in `src/tests/fixtures/` (`assistantFixtures.ts`, `serverHarness.ts`).

## Setup & Deployment

**Prerequisites**: Node.js `>= 22.6.0` (`npm`) or [Bun](https://bun.sh/) (`bun.lock`).

1. Copy `.env.example` to `.env` and configure:
   - `GEMINI_API_KEY` (required for AI recommendations)
   - `AQI_API_KEY` (optional WAQI token; falls back to Open-Meteo when unset)
   - `PORT` (optional HTTP port; defaults to `3000`; server binds on `0.0.0.0`)
2. Install and run locally:

```bash
npm install        # or: bun install
npm run dev        # or: bun run dev
```

## Scripts

All scripts defined in `package.json` (runnable with `npm run <script>` or `bun run <script>`):

- `dev` (`tsx server.ts`) — Starts the Express + Vite middleware development server.
- `start` (`NODE_ENV=production node server.ts`) — Starts the Express production server serving `dist/`.
- `build` (`vite build`) — Compiles the production Vite client bundle.
- `preview` (`vite preview`) — Previews the built Vite client bundle locally.
- `clean` (`rm -rf dist coverage`) — Removes build and coverage output directories.
- `lint` (`tsc --noEmit && eslint . --max-warnings 0`) — Runs TypeScript type-checking and zero-warning ESLint.
- `format` (`prettier --write .`) — Formats all repository files with Prettier.
- `format:check` (`prettier --check .`) — Verifies Prettier formatting without modifying files.
- `test` (`vitest run`) — Runs the full Vitest unit and integration test suite.

## Data Sources, Assumptions & Limitations

- **Scale**: Both **Open-Meteo Air Quality** (`us_aqi`) and **WAQI** (`aqi` feeds) report AQI on the **US scale (`0–500`)**; raw values above `500` from monitoring stations are accepted, classified as Hazardous, and tagged `"above scale"`.
- **Data Sources**: Live air metrics use **WAQI** (`api.waqi.info`) when `AQI_API_KEY` is configured or **Open-Meteo** (`open-meteo.com`) as keyless fallback; Indian city search queries Open-Meteo Geocoding with `countryCode=IN`; 24h hourly PM2.5 forecasts come from Open-Meteo (`hourly=pm2_5`); WHO 24-hour guidelines cite the 2021 WHO Global Air Quality Guidelines (`15 ug/m3` PM2.5, `45 ug/m3` PM10).
- **Conditional Hourly Sections**: If Open-Meteo hourly PM2.5 data is unavailable or the user submits via manual entry, both **Today's plan** and **Best time for outdoor activity** are hidden.
- **Educational Estimates**: Combined PM2.5 reduction percentages are heuristic estimates rather than clinical measurements.
