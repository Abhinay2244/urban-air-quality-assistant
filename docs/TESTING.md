# Testing & Verification Guide

The test suite runs with **Vitest**, **React Testing Library**, **@testing-library/jest-dom**, and **vitest-axe** (`jsdom`, configured in `vitest.config.ts` and `src/tests/setup.ts`). Coverage is collected via `@vitest/coverage-v8` across `src/`, `shared/`, `server/`, and `server.ts` with enforced minimum thresholds: **85% statements**, **75% branches**, **85% functions**, and **85% lines**.

## Test Suites

### 1. Accessibility & WCAG 2.2 AA (`vitest-axe` + Keyboard)

- `src/tests/features/Accessibility.test.tsx`: Runs automated `vitest-axe` audits across **empty**, **loading**, **error**, **results**, and **manual-entry** states in both **light** and **dark** themes (asserting zero axe violations), verifies the `"Skip to main content"` link targets `#main-content`, verifies the `AqiGauge` accessible label states value, category, and `US scale`, and proves displayed AQI always reflects the provider or manual reading rather than model-generated text.
- `src/tests/features/ProfileForm.test.tsx`: Tests the `LocationCard` ARIA 1.2 combobox (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `role="listbox"`, `role="option"`, `aria-selected`), keyboard navigation (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`), and polite suggestion-count announcement.
- `src/tests/features/App.test.tsx`: Verifies `aria-busy` on the results region (without a duplicate `aria-live`), programmatic focus movement to the results heading (`tabIndex={-1}`) upon plan completion, and focus movement to the `role="alert"` `ErrorBanner` on new errors.

### 2. Server Security & HTTP Hardening

- `src/tests/server/security.test.ts`: Verifies `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `X-DNS-Prefetch-Control`, HTTPS-only `Strict-Transport-Security` (via `X-Forwarded-Proto: https` behind `trust proxy`), strict production CSP (`script-src 'self'` with no `'unsafe-inline'` or `'unsafe-eval'`), and fixed-window per-IP rate limiting (`429` + `Retry-After`) with an injected clock.
- `src/tests/server/httpHardening.test.ts`: Verifies `x-powered-by` is disabled, `415 Unsupported Media Type` on `POST` routes lacking `application/json`, `405 Method Not Allowed` with `Allow` headers on disallowed methods, and explicit same-origin CORS enforcement (never `*`).
- `src/tests/server/app.test.ts`, `openapi.test.ts`: Verifies JSON `400` on malformed JSON, `413` on oversized bodies, `404` on unknown `/api/*` routes, and 1-to-1 route parity between Express and `docs/openapi.yaml`.

### 3. Server Handlers, Config & Observability

- `src/tests/server/aqiHandler.test.ts`, `citiesHandler.test.ts`, `handlers.test.ts`: Injects mock `fetch` via `ProviderDeps` (`createTestApp(env, { fetch })`) to test WAQI/Open-Meteo live AQI, `>500` readings, India-only city search (`countryCode=IN`), 502/504 error mapping, and `GET /api/health`.
- `src/tests/server/geminiFallback.test.ts`, `geminiErrorsAndCache.test.ts`, `geminiCache.test.ts`: Tests ordered `GEMINI_MODEL_CHAIN` fallback, `503`/`429` retry, `404`/timeout fast-skip, `ThinkingLevel.LOW`, cache TTL/FIFO eviction, and error classification.
- `src/tests/server/config.test.ts`, `logger.test.ts`, `observability.test.ts`: Tests 12-factor config validation, secret redaction, and `x-request-id` correlation.

### 4. Architecture & Dependency Boundaries

- `src/tests/architecture.test.ts`: Statically parses imports across `shared/`, `src/` (excluding `src/tests/`), `server/`, and `server.ts` using TypeScript `preProcessFile` to enforce `components -> hooks -> services`, `src -> shared`, `server -> shared`, `shared` independence, and zero circular dependencies.

### 5. Client Hooks, Services, Components & Utilities

- `src/tests/hooks/` (`assistantRunner.test.ts`, `useAssistant.test.ts`, `useAssistantCancellation.test.ts`, `useCityAutocomplete.test.ts`, `useCooldown.test.ts`, `useProfile.test.ts`).
- `src/tests/services/` (`aqiService.test.ts`, `geminiService.test.ts`, `httpClient.test.ts`).
- `src/tests/components/` (`ErrorBanner.test.tsx`, `ErrorBoundary.test.tsx`, `LoadingSkeleton.test.tsx`, `ProgressBar.test.tsx`, `ThemeToggle.test.tsx`).
- `src/tests/features/` (`ImpactSummary.test.tsx`, `ManualAqiForm.test.tsx`, `RecommendationCard.test.tsx`).
- `src/tests/utils/` & `src/tests/constants/` (`aqi.test.ts`, `aqiCalculations.test.ts`, `dailyPlan.test.ts`, `errors.test.ts`, `formatting.test.ts`, `locationValidation.test.ts`, `outdoorWindow.test.ts`, `parserAndSanitizing.test.ts`, `urgencyRules.test.ts`, `validation.test.ts`).

## Running Tests & Audits

```bash
npm run test            # Run all unit & integration tests
npm run test:coverage   # Run suite and enforce v8 coverage thresholds
npm run lint            # Zero-warning strict ESLint (incl. layer import rules)
npm run typecheck       # Strict TypeScript check
npm run format:check    # Verify Prettier formatting
npm run arch:check      # Check circular dependencies via madge
npm run build           # Build production Vite bundle
npm run check           # Run lint, typecheck, format:check, arch:check, test, and build in order
bun audit               # Read-only dependency vulnerability check
```
