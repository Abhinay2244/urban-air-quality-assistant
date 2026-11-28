# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0]

### Added

- India-focused household air quality web application built with React, Vite, Tailwind CSS, and Express.
- India-only city autocomplete (`GET /api/cities?q=...` via Open-Meteo Geocoding with `countryCode=IN`) with an accessible ARIA combobox and keyboard navigation.
- Server-side live AQI proxy (`GET /api/aqi`) supporting WAQI (when `AQI_API_KEY` is configured) with Open-Meteo fallback (`us_aqi`, `pm2_5`, `pm10`, `no2`, `o3`), preserving raw readings above `500` as Hazardous (`"above scale"`) and flagging non-India or `>50 km` monitoring stations.
- Manual AQI fallback form accepting required AQI (`0-500`) and optional PM2.5 (`0-1000 ug/m3`) and PM10 (`0-2000 ug/m3`), labeled `"Manual entry"`.
- 24-hour hourly PM2.5 **Today's plan** (`Morning`, `Afternoon`, `Evening`) and **Best time for outdoor activity** 2-hour window computed from Open-Meteo forecasts.
- Personalized recommendation proxy (`POST /api/assistant/recommendations`) using an ordered Gemini model fallback chain (`gemini-4-hydrogen` -> `gemini-3.1-flash-lite`) with `ThinkingLevel.LOW`, `maxOutputTokens: 4096`, single `800 ms` retries on `503`/`429`, immediate model skip on timeout/`404`, and a bounded FIFO response cache (`10`-minute TTL, max `100` entries).
- Deterministic post-model US EPA urgency rule engine (`applyUrgencyRules`) triggering critical alerts at `101+` for sensitive households and `151+` universally, alongside safe JSON fallback handling (`SAFE_FALLBACK_ASSISTANT_RESPONSE`).
- Household persona support (`Nuclear family`, `Multi-generational`, `Working professional`, `Student`, `Couple`, `Single adult`) with 6 India quick-select sample scenarios and WHO 24h guideline comparisons (`15.0 ug/m3` PM2.5, `45.0 ug/m3` PM10).
- Production HTTP security hardening, strict CSP (`script-src 'self'`), explicit same-origin CORS, `415`/`405` validation, per-IP rate limiting, structured JSON logging with secret redaction, `x-request-id` correlation, and `GET /api/health`.
- Light/dark theme switcher, WCAG 2.2 AA accessibility controls verified with `vitest-axe`, OpenAPI 3.1 specification (`docs/openapi.yaml`), multi-stage `Dockerfile`, ADRs (`docs/adr/`), and strict CI checks.
