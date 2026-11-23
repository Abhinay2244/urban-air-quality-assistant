/**
 * @module server/waqiProvider
 * Responsibility: Fetch and normalize live AQI payloads (including >500 values) from WAQI feeds.
 * Must not handle Express Request/Response objects or leak API tokens in logs.
 */
import { API_ENDPOINTS } from '../src/constants/http.ts';
import { DEFAULT_COUNTRY, SERVER_CONFIG } from '../src/constants/server.ts';
import type { AqiProvider, Coordinates, HourlyPm25Point } from '../src/types/index.ts';
import { buildLocationWarning } from '../src/utils/locationValidation.ts';
import { isRecord } from '../src/utils/typeGuards.ts';
import { logServerError } from './errorResponse.ts';

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

/** Query parameters accepted by live AQI providers (city name and/or coordinates). */
export interface AqiLookupTarget {
  city?: string;
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

/** Safely parses an upstream Response body as unknown JSON, logging non-OK/parse failures. */
export async function parseJsonResponse(res: Response, context: string): Promise<unknown> {
  if (!res.ok) {
    logServerError(context, new Error(`Upstream HTTP ${res.status}`));
    return null;
  }
  try {
    return await res.json();
  } catch (error: unknown) {
    logServerError(context, error);
    return null;
  }
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
  const [lat, lon] = rawGeo;
  return typeof lat === 'number' &&
    Number.isFinite(lat) &&
    typeof lon === 'number' &&
    Number.isFinite(lon)
    ? { latitude: lat, longitude: lon }
    : undefined;
}

/** Queries the WAQI feed API by coordinates (`geo:lat;lon`) or city when `AQI_API_KEY` is set. */
export async function fetchFromWaqi(
  target: AqiLookupTarget,
  apiKey: string,
): Promise<LiveAqiPayload | null> {
  const feedSegment = target.coords
    ? `geo:${target.coords.latitude};${target.coords.longitude}`
    : encodeURIComponent(target.city ?? '');
  const url = `${API_ENDPOINTS.WAQI_FEED}/${feedSegment}/?token=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(SERVER_CONFIG.PROVIDER_TIMEOUT_MS) });
  const raw = await parseJsonResponse(res, 'WAQI Provider');
  if (!isRecord(raw) || raw.status !== 'ok' || !isRecord(raw.data)) return null;

  // Why: Severe pollution episodes (e.g., Delhi stations) can report raw US-scale readings above
  // 500; we accept and display the uncapped reading rather than clamping or rejecting real telemetry.
  const aqi = readFiniteMetric(raw.data, 'aqi');
  if (aqi === undefined) return null;

  const cityObj = isRecord(raw.data.city) ? raw.data.city : undefined;
  const timeObj = isRecord(raw.data.time) ? raw.data.time : undefined;
  const iaqi = isRecord(raw.data.iaqi) ? raw.data.iaqi : undefined;
  const stationName =
    typeof cityObj?.name === 'string' ? cityObj.name : (target.city ?? 'Nearest station');
  const stationCoords = readCoordsPair(cityObj?.geo);
  const pm10 = readNestedMetric(iaqi, 'pm10');
  const locationWarning = buildLocationWarning({
    resolvedPlace: stationName,
    stationCoords,
    requestedCoords: target.coords,
    requestedLabel: target.city,
  });

  return {
    city: target.city || stationName,
    country: DEFAULT_COUNTRY,
    stationName,
    provider: 'waqi',
    ...(locationWarning ? { locationWarning } : {}),
    ...(stationCoords ? { stationCoords } : {}),
    aqi: Math.round(aqi),
    pm25: readNestedMetric(iaqi, 'pm25') ?? 0,
    ...(pm10 !== undefined ? { pm10 } : {}),
    no2: readNestedMetric(iaqi, 'no2') ?? 0,
    o3: readNestedMetric(iaqi, 'o3') ?? 0,
    updatedAt: typeof timeObj?.iso === 'string' ? timeObj.iso : new Date().toISOString(),
  };
}
