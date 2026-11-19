# Architecture

## Layer Stack

`UI (App / features / components)` -> `hooks` -> `services` -> `server`

- **UI (`src/App.tsx`, `src/features/`, `src/components/`)**: Renders accessible forms, AQI gauges, impact bars, and recommendation cards. Reads state and callbacks exclusively from hooks.
- **Hooks (`src/hooks/`)**: Orchestrate profile validation (`useProfile`), submit cooldown timers (`useCooldown`), and AQI/AI request lifecycles with `AbortController` cancellation (`useAssistant`).
- **Services (`src/services/`)**: Client-side HTTP boundary (`httpClient`, `aqiService`, `geminiService`) responsible for `fetch` execution, runtime payload type guards, and mapping network errors to `AppError`.
- **Server (`server.ts`, `server/`)**: Express application (`createApp()`) handling security headers, per-IP rate limiting, request validation, WAQI/Open-Meteo AQI lookups, and server-side `@google/genai` calls.

## Data Flow

1. User edits household inputs in `ProfileForm`; `useProfile` validates live via `utils/validation.ts`.
2. Submitting invokes `useAssistant.requestRecommendations`, aborting any prior in-flight `AbortController` and passing the new `AbortSignal` into `fetchAqiDataByCity` (`GET /api/aqi`).
3. If live AQI lookup fails, `isAqiUnavailable` reveals `ManualAqiForm`, which builds validated `AqiData` via `createManualAqiData`.
4. Validated `UserProfile` + `AqiData` are sent to `POST /api/assistant/recommendations`, where `server/geminiHandler.ts` calls Gemini using `GEMINI_API_KEY` from the server environment.
5. `parseAndValidateAssistantResponse` sanitizes model JSON (falling back safely on parse failure), and `applyUrgencyRules` deterministically ranks health alerts and lifestyle rules before UI rendering.

## Error Contract

All API errors and client service failures conform to `{ code, message }` (typed as `AppError` with `ErrorCode` from `src/constants/http.ts`):

- Client validation failures produce `VALIDATION_ERROR` inline before network requests.
- Server error responses use `server/errorResponse.ts` (`sendErrorResponse`), returning structured JSON with no stack traces, HTML pages, or secrets.
- `AbortError` cancellations are rethrown silently by services and ignored in `useAssistant`.

## Dependency Rules

- `src/types/` imports only `src/constants/http.ts` (`ERROR_CODES`).
- `src/constants/` imports only `src/types/` and sibling constants.
- `src/utils/` imports only `src/constants/`, `src/types/`, and sibling utilities.
- `src/services/` imports `src/constants/`, `src/types/`, and `src/utils/`.
- `src/hooks/` imports `src/constants/`, `src/types/`, `src/utils/`, and `src/services/`.
- `src/components/` and `src/features/` **never** import `src/services/` or `server/`.
- `server/` imports only Express/Node modules, `src/constants/`, and `src/utils/` (no circular imports).
