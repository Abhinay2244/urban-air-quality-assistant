/**
 * @module server/waqiNormalize
 * Responsibility: Normalize WAQI raw telemetry payloads and location warnings.
 * Must not perform HTTP requests or handle Express Request/Response objects.
 */
import { INPUT_LIMITS } from '../../shared/constants/limits.ts';
import { DEFAULT_COUNTRY } from '../../shared/constants/server.ts';
import type { AqiProvider, Coordinates, HourlyPm25Point } from '../../shared/types/index.ts';
import { buildLocationWarning } from '../../shared/utils/locationValidation.ts';
import { sanitizeText } from '../../shared/utils/sanitizing.ts';
import { isRecord } from '../../shared/utils/typeGuards.ts';
import { type ClockFn, DEFAULT_PROVIDER_DEPS } from './providerDeps.ts';

/** Normalized air quality response returned by external AQI providers. */
export interface LiveAqiPayload {
  city: string;
  country: string;
  stationName?: string;
  provider: AqiProvider;
  locationWarning?: string;
  stationCoords?: Coordinates;
  aqi: number;
  pm25: number;
  pm10?: number;
  no2: number;
  o3: number;
  updatedAt: string;
  hourlyPm25?: HourlyPm25Point[];
}

/** Query parameters accepted by live AQI providers (city name and optional selected coordinates). */
export interface AqiLookupTarget {
  city: string;
  coords?: Coordinates;
}

/** Reads a non-negative finite numeric property from an optional plain object. */
export function readFiniteMetric(
  record: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  if (!record) return undefined;
  const val = record[key];
  return typeof val === 'number' && Number.isFinite(val) && val >= 0 ? val : undefined;
}

function readNestedMetric(
  iaqi: Record<string, unknown> | undefined,
  key: string,
): number | undefined {
  if (!iaqi) return undefined;
  const metric = iaqi[key];
  return isRecord(metric) ? readFiniteMetric(metric, 'v') : undefined;
}

function readCoordsPair(rawGeo: unknown): Coordinates | undefined {
  if (!Array.isArray(rawGeo) || rawGeo.length < 2) return undefined;
  const coordsList: readonly unknown[] = rawGeo;
  const [lat, lon] = coordsList;
  const valid =
    typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lon === 'number' &&
    Number.isFinite(lon);
  return valid ? { latitude: lat, longitude: lon } : undefined;
}

function resolveCityName(rawCity: string, stationName: string | undefined): string {
  const candidate = sanitizeText(rawCity, INPUT_LIMITS.MAX_CITY_LENGTH);
  return candidate.length >= INPUT_LIMITS.MIN_CITY_LENGTH ? candidate : (stationName ?? rawCity);
}

function readWaqiMetrics(iaqi: Record<string, unknown> | undefined): {
  pm25: number;
  pm10?: number;
  no2: number;
  o3: number;
} {
  const pm10 = readNestedMetric(iaqi, 'pm10');
  return {
    pm25: readNestedMetric(iaqi, 'pm25') ?? 0,
    ...(pm10 !== undefined ? { pm10 } : {}),
    no2: readNestedMetric(iaqi, 'no2') ?? 0,
    o3: readNestedMetric(iaqi, 'o3') ?? 0,
  };
}

function resolveWaqiStationName(cityObj: Record<string, unknown> | undefined): string | undefined {
  const rawStation = cityObj && typeof cityObj.name === 'string' ? cityObj.name : '';
  const cleanStation = sanitizeText(rawStation, INPUT_LIMITS.MAX_TEXT_LENGTH);
  return cleanStation.length > 0 ? cleanStation : undefined;
}

function resolveWaqiOptionalFields(
  stationName: string | undefined,
  resolvedCity: string,
  stationCoords: Coordinates | undefined,
  target: AqiLookupTarget,
): Pick<LiveAqiPayload, 'stationName' | 'locationWarning' | 'stationCoords'> {
  const locationWarning = buildLocationWarning({
    resolvedPlace: stationName ?? resolvedCity,
    ...(stationCoords !== undefined ? { stationCoords } : {}),
    ...(target.coords !== undefined ? { requestedCoords: target.coords } : {}),
    requestedLabel: target.city,
  });
  return {
    ...(stationName !== undefined ? { stationName } : {}),
    ...(locationWarning ? { locationWarning } : {}),
    ...(stationCoords !== undefined ? { stationCoords } : {}),
  };
}

/** Normalizes a validated WAQI `data` record into a LiveAqiPayload. */
export function normalizeWaqiData(
  data: Record<string, unknown>,
  aqi: number,
  target: AqiLookupTarget,
  now: ClockFn = DEFAULT_PROVIDER_DEPS.now,
): LiveAqiPayload {
  const cityObj = isRecord(data.city) ? data.city : undefined;
  const timeObj = isRecord(data.time) ? data.time : undefined;
  const iaqi = isRecord(data.iaqi) ? data.iaqi : undefined;
  const stationName = resolveWaqiStationName(cityObj);
  const resolvedCity = resolveCityName(target.city, stationName);
  const stationCoords = readCoordsPair(cityObj?.geo);
  const updatedAt =
    timeObj && typeof timeObj.iso === 'string' ? timeObj.iso : new Date(now()).toISOString();
  return {
    city: resolvedCity,
    country: DEFAULT_COUNTRY,
    provider: 'waqi',
    aqi: Math.round(aqi),
    ...readWaqiMetrics(iaqi),
    updatedAt,
    ...resolveWaqiOptionalFields(stationName, resolvedCity, stationCoords, target),
  };
}
