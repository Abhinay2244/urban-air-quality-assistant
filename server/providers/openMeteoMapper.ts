/**
 * @module server/openMeteoMapper
 * Responsibility: Normalize Open-Meteo geocoding and air quality payloads into LiveAqiPayload.
 * Must not perform network calls directly or handle Express Request/Response objects.
 */
import { INDIA_GEO_BOUNDS } from '../../shared/constants/aqi.ts';
import { INPUT_LIMITS } from '../../shared/constants/limits.ts';
import { DEFAULT_COUNTRY } from '../../shared/constants/server.ts';
import type { Coordinates } from '../../shared/types/index.ts';
import { buildLocationWarning } from '../../shared/utils/locationValidation.ts';
import { sanitizeText } from '../../shared/utils/sanitizing.ts';
import { isRecord } from '../../shared/utils/typeGuards.ts';
import { parseHourlyPm25 } from './hourlyForecastProvider.ts';
import { type ClockFn, DEFAULT_PROVIDER_DEPS } from './providerDeps.ts';
import { type AqiLookupTarget, type LiveAqiPayload, readFiniteMetric } from './waqiProvider.ts';

/** Resolved geocoding location metadata for Open-Meteo AQI queries. */
export interface ResolvedOpenMeteoLocation {
  coords: Coordinates;
  resolvedCity: string;
  country: string;
  countryCode?: string;
}

/** Geocoding lookup result discriminated union. */
export type TargetLookupResult =
  | { status: 'ok'; location: ResolvedOpenMeteoLocation }
  | { status: 'not_found' }
  | { status: 'error' };

const readFiniteCoord = (record: Record<string, unknown>, key: string): number | undefined =>
  typeof record[key] === 'number' && Number.isFinite(record[key]) ? record[key] : undefined;

const readStringProp = (record: Record<string, unknown>, key: string): string | undefined =>
  typeof record[key] === 'string' ? record[key] : undefined;

/** Parses the preferred Indian or top geocoding entry from raw Open-Meteo geocoding JSON. */
export function selectGeocodedLocation(geoRaw: unknown, fallbackCity: string): TargetLookupResult {
  const list =
    isRecord(geoRaw) && Array.isArray(geoRaw.results) ? geoRaw.results.filter(isRecord) : [];
  const loc = list.find((item) => item.country_code === INDIA_GEO_BOUNDS.COUNTRY_CODE) ?? list[0];
  if (!loc) return { status: 'not_found' };
  const lat = readFiniteCoord(loc, 'latitude');
  const lon = readFiniteCoord(loc, 'longitude');
  if (lat === undefined || lon === undefined) return { status: 'not_found' };
  const countryCode = readStringProp(loc, 'country_code');
  return {
    status: 'ok',
    location: {
      coords: { latitude: lat, longitude: lon },
      resolvedCity: readStringProp(loc, 'name') ?? fallbackCity,
      country: readStringProp(loc, 'country') ?? DEFAULT_COUNTRY,
      ...(countryCode !== undefined ? { countryCode } : {}),
    },
  };
}

function formatOpenMeteoPlace(
  resolved: ResolvedOpenMeteoLocation,
  target: AqiLookupTarget,
): { safeCity: string; stationName: string; locationWarning: string | undefined } {
  const { coords, resolvedCity, country, countryCode } = resolved;
  const cleanCity = sanitizeText(resolvedCity, INPUT_LIMITS.MAX_CITY_LENGTH);
  const safeCity = cleanCity.length >= INPUT_LIMITS.MIN_CITY_LENGTH ? cleanCity : target.city;
  const stationName = sanitizeText(
    `${safeCity} (${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)})`,
    INPUT_LIMITS.MAX_TEXT_LENGTH,
  );
  const locationWarning = buildLocationWarning({
    resolvedPlace: country !== DEFAULT_COUNTRY ? `${safeCity}, ${country}` : stationName,
    country,
    ...(countryCode !== undefined ? { countryCode } : {}),
    stationCoords: coords,
    ...(target.coords !== undefined ? { requestedCoords: target.coords } : {}),
    requestedLabel: target.city,
  });
  return { safeCity, stationName, locationWarning };
}

function readOpenMeteoMetrics(current: Record<string, unknown> | undefined): {
  pm25: number;
  pm10?: number;
  no2: number;
  o3: number;
} {
  const pm10 = readFiniteMetric(current, 'pm10');
  return {
    pm25: readFiniteMetric(current, 'pm2_5') ?? 0,
    ...(pm10 !== undefined ? { pm10 } : {}),
    no2: readFiniteMetric(current, 'nitrogen_dioxide') ?? 0,
    o3: readFiniteMetric(current, 'ozone') ?? 0,
  };
}

/** Converts an Open-Meteo Air Quality JSON response into LiveAqiPayload or null if invalid. */
export function buildOpenMeteoPayload(
  aqiRaw: unknown,
  resolved: ResolvedOpenMeteoLocation,
  target: AqiLookupTarget,
  now: ClockFn = DEFAULT_PROVIDER_DEPS.now,
): LiveAqiPayload | null {
  const current = isRecord(aqiRaw) && isRecord(aqiRaw.current) ? aqiRaw.current : undefined;
  const usAqi = readFiniteMetric(current, 'us_aqi');
  if (usAqi === undefined) return null;
  const hourlyPm25 = parseHourlyPm25(aqiRaw);
  const { safeCity, stationName, locationWarning } = formatOpenMeteoPlace(resolved, target);
  const timestamp = current ? readStringProp(current, 'time') : undefined;
  return {
    city: safeCity,
    country: resolved.country,
    stationName,
    provider: 'open-meteo',
    ...(locationWarning ? { locationWarning } : {}),
    aqi: Math.round(usAqi),
    ...readOpenMeteoMetrics(current),
    updatedAt: timestamp ?? new Date(now()).toISOString(),
    ...(hourlyPm25 ? { hourlyPm25 } : {}),
  };
}
