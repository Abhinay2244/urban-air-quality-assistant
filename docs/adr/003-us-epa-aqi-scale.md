# ADR 003: US EPA AQI Scale

- **Status**: Accepted

## Context

Air quality feeds across India and global APIs use different regional indices (such as India NAQI vs. US EPA AQI), which differ in pollutant breakpoints and numeric thresholds. Comparing values from mixed scales without an explicit standard causes misleading category labels and inconsistent health alerts.

## Decision

Standardize all category breakpoints, UI gauge colors, urgency thresholds, and copy on the **US EPA AQI scale (`0–500`, as reported by WAQI and Open-Meteo `us_aqi`)**, defined in `shared/constants/aqi.ts`. Live station readings above `500` remain displayed verbatim under `HAZARDOUS` with an explicit `"above scale"` note, while PM2.5 (`15.0 ug/m3`) and PM10 (`45.0 ug/m3`) also reference WHO 24-hour guidelines.

## Consequences

- `WAQI` and `Open-Meteo` fallback payloads share one consistent `0–500+` classification model (`Good`, `Moderate`, `Unhealthy for Sensitive Groups`, `Unhealthy`, `Very Unhealthy`, `Hazardous`).
- Accessible gauge labels and badges explicitly disclose `US scale` so users do not confuse readings with India NAQI.
- Urgency rules (`101+` sensitive, `151+` universal) align directly with US EPA category boundaries.
