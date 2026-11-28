/**
 * @module server/hourlyForecastProvider
 * Responsibility: Fetch Open-Meteo geocoding (including India-only search) and 24h hourly PM2.5 data.
 * Must not handle Express Request/Response objects or modify primary error semantics.
 */
import { INDIA_GEO_BOUNDS } from '../../shared/constants/aqi.ts';
import { API_ENDPOINTS } from '../../shared/constants/http.ts';
import { INPUT_LIMITS } from '../../shared/constants/limits.ts';
import { DEFAULT_COUNTRY, SERVER_CONFIG } from '../../shared/constants/server.ts';
import type { CitySearchResult, HourlyPm25Point } from '../../shared/types/index.ts';
import { isBoundedFinite, isRecord } from '../../shared/utils/typeGuards.ts';
import { DEFAULT_PROVIDER_DEPS, type FetchFn } from './providerDeps.ts';

function readFinite(rec: Record<string, unknown>, key: string): number | undefined {
  const val = rec[key];
  return typeof val === 'number' && Number.isFinite(val) ? val : undefined;
}

function parseCityCandidate(raw: unknown): CitySearchResult | null {
  if (!isRecord(raw) || typeof raw.name !== 'string') return null;
  const latitude = readFinite(raw, 'latitude');
  const longitude = readFinite(raw, 'longitude');
  if (latitude === undefined || longitude === undefined) return null;
  return {
    name: raw.name,
    ...(typeof raw.admin1 === 'string' && raw.admin1.length > 0 ? { admin1: raw.admin1 } : {}),
    country: typeof raw.country === 'string' ? raw.country : DEFAULT_COUNTRY,
    ...(typeof raw.country_code === 'string' ? { countryCode: raw.country_code } : {}),
    latitude,
    longitude,
  };
}

function extractHourlyPoints(
  times: readonly unknown[],
  values: readonly unknown[],
): HourlyPm25Point[] | undefined {
  const limit = Math.min(times.length, values.length, INPUT_LIMITS.HOURLY_FORECAST_HOURS);
  const points: HourlyPm25Point[] = [];
  for (let i = 0; i < limit; i += 1) {
    const time = times[i];
    const pm25 = values[i];
    if (
      typeof time === 'string' &&
      time.length > 0 &&
      isBoundedFinite(pm25, Number.MAX_SAFE_INTEGER)
    ) {
      points.push({ time, pm25 });
    }
  }
  return points.length > 0 ? points : undefined;
}

/** Extracts up to 24 valid non-negative hourly PM2.5 entries from an Open-Meteo response body. */
export function parseHourlyPm25(raw: unknown): HourlyPm25Point[] | undefined {
  if (!isRecord(raw) || !isRecord(raw.hourly)) return undefined;
  const { time, pm2_5: pm25Values } = raw.hourly;
  if (!Array.isArray(time) || !Array.isArray(pm25Values)) return undefined;
  return extractHourlyPoints(time, pm25Values);
}

/** Queries Open-Meteo Geocoding strictly filtered to India (`countryCode=IN`). */
export async function searchIndianCities(
  query: string,
  fetchFn: FetchFn = DEFAULT_PROVIDER_DEPS.fetch,
): Promise<CitySearchResult[] | null> {
  const url = `${API_ENDPOINTS.GEOCODING}?name=${encodeURIComponent(query)}&count=${INPUT_LIMITS.MAX_CITY_SEARCH_RESULTS}&language=en&format=json&countryCode=${INDIA_GEO_BOUNDS.COUNTRY_CODE}`;
  const res = await fetchFn(url, {
    signal: AbortSignal.timeout(SERVER_CONFIG.PROVIDER_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const raw: unknown = await res.json();
  if (!isRecord(raw)) return null;
  if (!Array.isArray(raw.results)) return [];
  return raw.results
    .map(parseCityCandidate)
    .filter((item): item is CitySearchResult => item !== null);
}

/** Queries Open-Meteo 24h hourly PM2.5 forecast directly by latitude and longitude. */
export async function fetchOpenMeteoHourlyByCoords(
  latitude: number,
  longitude: number,
  fetchFn: FetchFn = DEFAULT_PROVIDER_DEPS.fetch,
): Promise<HourlyPm25Point[] | undefined> {
  try {
    const url = `${API_ENDPOINTS.AIR_QUALITY}?latitude=${latitude}&longitude=${longitude}&hourly=pm2_5&forecast_hours=${INPUT_LIMITS.HOURLY_FORECAST_HOURS}&timezone=auto`;
    const res = await fetchFn(url, {
      signal: AbortSignal.timeout(SERVER_CONFIG.PROVIDER_TIMEOUT_MS),
    });
    if (!res.ok) return undefined;
    const raw: unknown = await res.json();
    return parseHourlyPm25(raw);
  } catch {
    return undefined;
  }
}

/**
 * Resolves city coordinates (preferring Indian matches) and fetches optional 24h hourly PM2.5 data.
 * Never throws so primary WAQI lookups never degrade.
 */
export async function fetchOpenMeteoHourlyByCity(
  city: string,
  fetchFn: FetchFn = DEFAULT_PROVIDER_DEPS.fetch,
): Promise<{
  hourlyPm25?: HourlyPm25Point[];
  coords?: { latitude: number; longitude: number };
}> {
  try {
    const geoUrl = `${API_ENDPOINTS.GEOCODING}?name=${encodeURIComponent(city)}&count=${SERVER_CONFIG.GEOCODING_RESULT_COUNT}&language=en&format=json`;
    const geoRes = await fetchFn(geoUrl, {
      signal: AbortSignal.timeout(SERVER_CONFIG.PROVIDER_TIMEOUT_MS),
    });
    if (!geoRes.ok) return {};
    const geoRaw: unknown = await geoRes.json();
    const results = isRecord(geoRaw) && Array.isArray(geoRaw.results) ? geoRaw.results : [];
    const parsed = results.map(parseCityCandidate).filter((c): c is CitySearchResult => c !== null);
    const preferred =
      parsed.find((c) => c.countryCode === INDIA_GEO_BOUNDS.COUNTRY_CODE) ?? parsed[0];
    if (!preferred) return {};

    const hourlyPm25 = await fetchOpenMeteoHourlyByCoords(
      preferred.latitude,
      preferred.longitude,
      fetchFn,
    );
    return {
      ...(hourlyPm25 !== undefined ? { hourlyPm25 } : {}),
      coords: { latitude: preferred.latitude, longitude: preferred.longitude },
    };
  } catch {
    return {};
  }
}
