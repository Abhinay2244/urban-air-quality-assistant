/**
 * @module services/aqiPayloadParser
 * Responsibility: Validate and normalize raw JSON responses from /api/aqi into typed AqiData.
 * Must not invoke fetch, manage UI state, or throw raw syntax errors.
 */
import { DEFAULT_COUNTRY } from '../constants/server.ts';
import type { AqiData, AqiProvider, HourlyPm25Point } from '../types/index.ts';
import { getAqiCategoryByValue } from '../utils/aqiCalculations.ts';
import { isHourlyPm25Array, isOneOf, isRecord } from '../utils/typeGuards.ts';

/** Raw JSON response shape returned by /api/aqi. */
export interface LiveAqiResponsePayload {
  city?: string;
  country?: string;
  stationName?: string;
  provider?: AqiProvider;
  locationWarning?: string;
  aqi: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  o3?: number;
  updatedAt?: string;
  hourlyPm25?: HourlyPm25Point[];
}

const PROVIDERS: readonly AqiProvider[] = ['waqi', 'open-meteo'];

/** Type guard verifying an unknown payload contains a valid non-negative AQI value. */
export function isLiveAqiPayload(raw: unknown): raw is LiveAqiResponsePayload {
  return isRecord(raw) && typeof raw.aqi === 'number' && Number.isFinite(raw.aqi) && raw.aqi >= 0;
}

function readOptionalFinite(raw: unknown): number | undefined {
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : undefined;
}

/** Normalizes a validated /api/aqi response payload into AqiData without capping live AQI > 500. */
export function normalizeLiveAqiPayload(
  payload: LiveAqiResponsePayload,
  fallbackCity: string,
): AqiData {
  const aqi = Math.round(payload.aqi);
  const pm10 = readOptionalFinite(payload.pm10);
  const hourlyPm25 = isHourlyPm25Array(payload.hourlyPm25) ? payload.hourlyPm25 : undefined;
  const provider = isOneOf(payload.provider, PROVIDERS) ? payload.provider : undefined;
  const stationName =
    typeof payload.stationName === 'string' && payload.stationName.length > 0
      ? payload.stationName
      : undefined;
  const locationWarning =
    typeof payload.locationWarning === 'string' && payload.locationWarning.length > 0
      ? payload.locationWarning
      : undefined;

  return {
    city: typeof payload.city === 'string' ? payload.city : fallbackCity,
    country: typeof payload.country === 'string' ? payload.country : DEFAULT_COUNTRY,
    ...(stationName ? { stationName } : {}),
    ...(provider ? { provider } : {}),
    ...(locationWarning ? { locationWarning } : {}),
    aqi,
    pm25: readOptionalFinite(payload.pm25) ?? 0,
    ...(pm10 !== undefined ? { pm10 } : {}),
    no2: readOptionalFinite(payload.no2) ?? 0,
    o3: readOptionalFinite(payload.o3) ?? 0,
    category: getAqiCategoryByValue(aqi).id,
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
    ...(hourlyPm25 && hourlyPm25.length > 0 ? { hourlyPm25 } : {}),
    source: 'live',
  };
}
