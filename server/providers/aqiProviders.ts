/**
 * @module server/providers/aqiProviders
 * Responsibility: Fetch live Open-Meteo AQI payloads by city or coordinates using injected fetch/clock.
 * Must not handle Express Request/Response objects or leak API tokens in logs.
 */
import { INDIA_GEO_BOUNDS } from '../../shared/constants/aqi.ts';
import { API_ENDPOINTS } from '../../shared/constants/http.ts';
import { INPUT_LIMITS } from '../../shared/constants/limits.ts';
import { SERVER_CONFIG } from '../../shared/constants/server.ts';
import {
  buildOpenMeteoPayload,
  selectGeocodedLocation,
  type TargetLookupResult,
} from './openMeteoMapper.ts';
import { DEFAULT_PROVIDER_DEPS, type FetchFn, type ProviderDeps } from './providerDeps.ts';
import { type AqiLookupTarget, type LiveAqiPayload, parseJsonResponse } from './waqiProvider.ts';

async function resolveTargetLocation(
  target: AqiLookupTarget,
  fetchFn: FetchFn,
): Promise<TargetLookupResult> {
  if (target.coords) {
    return {
      status: 'ok',
      location: {
        coords: target.coords,
        resolvedCity: target.city,
        country: INDIA_GEO_BOUNDS.COUNTRY_NAME,
      },
    };
  }
  const geoUrl = `${API_ENDPOINTS.GEOCODING}?name=${encodeURIComponent(target.city)}&count=${SERVER_CONFIG.GEOCODING_RESULT_COUNT}&language=en&format=json`;
  const geoRaw = await parseJsonResponse(
    await fetchFn(geoUrl, { signal: AbortSignal.timeout(SERVER_CONFIG.PROVIDER_TIMEOUT_MS) }),
    'Open-Meteo Geocoding',
  );
  return geoRaw === null ? { status: 'error' } : selectGeocodedLocation(geoRaw, target.city);
}

/** Queries Open-Meteo by coordinates or geocoded city (preferring India) for current + 24h hourly PM2.5. */
export async function fetchFromOpenMeteo(
  target: AqiLookupTarget,
  deps: ProviderDeps = DEFAULT_PROVIDER_DEPS,
): Promise<LiveAqiPayload | 'not_found' | null> {
  const lookup = await resolveTargetLocation(target, deps.fetch);
  if (lookup.status === 'not_found') return 'not_found';
  if (lookup.status === 'error') return null;
  const { coords } = lookup.location;
  const aqiUrl = `${API_ENDPOINTS.AIR_QUALITY}?latitude=${coords.latitude}&longitude=${coords.longitude}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&hourly=pm2_5&forecast_hours=${INPUT_LIMITS.HOURLY_FORECAST_HOURS}&timezone=auto`;
  const aqiRaw = await parseJsonResponse(
    await deps.fetch(aqiUrl, { signal: AbortSignal.timeout(SERVER_CONFIG.PROVIDER_TIMEOUT_MS) }),
    'Open-Meteo Air Quality',
  );
  return buildOpenMeteoPayload(aqiRaw, lookup.location, target, deps.now);
}
