# ADR 006: No Browser Geolocation Feature

- **Status**: Accepted

## Context

Requesting `navigator.geolocation` adds permission friction, leaks user GPS coordinates, complicates CSP/permissions policies, and is unnecessary when households often check air quality for family members or target cities across India.

## Decision

Do not implement browser geolocation. Enforce `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()` in `server/middleware/securityMiddleware.ts`, and resolve locations exclusively via India-only city search autocomplete (`GET /api/cities?q=...` using Open-Meteo Geocoding with `countryCode=IN`) or direct city input (`LocationCard`).

## Consequences

- Zero device-location permission prompts and minimal PII exposure.
- Users can evaluate any Indian city (or switch personas via the 6 sample scenarios) regardless of physical location.
- Station-mismatch warnings (`INDIA_GEO_BOUNDS` and `50 km` threshold) still alert users when an upstream monitoring station sits far from the selected Indian city.
