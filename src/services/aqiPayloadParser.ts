/**
 * @module services/aqiPayloadParser
 * Responsibility: Validate and normalize raw JSON responses from /api/aqi into typed AqiData.
 * Must not invoke fetch, manage UI state, or throw raw syntax errors.
 */
import { INPUT_LIMITS } from '../constants/limits.ts';
import { DEFAULT_COUNTRY } from '../constants/server.ts';
import type { AqiData, AqiProvider, HourlyPm25Point } from '../types/index.ts';
import { getAqiCategoryByValue } from '../utils/aqiCalculations.ts';
import { sanitizeText } from '../utils/sanitizing.ts';
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

function resolveCityName(rawCity: unknown, fallbackCity: string): string {
  const cleanCity =
    typeof rawCity === 'string' ? sanitizeText(rawCity, INPUT_LIMITS.MAX_CITY_LENGTH) : '';
  return cleanCity.length >= INPUT_LIMITS.MIN_CITY_LENGTH
    ? cleanCity
    : sanitizeText(fallbackCity, INPUT_LIMITS.MAX_CITY_LENGTH);
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
  const cleanCountry =
    typeof payload.country === 'string'
      ? sanitizeText(payload.country, INPUT_LIMITS.MAX_CITY_LENGTH)
      : '';
  const stationName =
    typeof payload.stationName === 'string'
      ? sanitizeText(payload.stationName, INPUT_LIMITS.MAX_TEXT_LENGTH) || undefined
      : undefined;
  const locationWarning =
    typeof payload.locationWarning === 'string'
      ? sanitizeText(payload.locationWarning, INPUT_LIMITS.MAX_TEXT_LENGTH) || undefined
      : undefined;
  const updatedAt =
    typeof payload.updatedAt === 'string'
      ? sanitizeText(payload.updatedAt, INPUT_LIMITS.MAX_CITY_LENGTH) || new Date().toISOString()
      : new Date().toISOString();

  return {
    city: resolveCityName(payload.city, fallbackCity),
    country: cleanCountry || DEFAULT_COUNTRY,
    ...(stationName ? { stationName } : {}),
    ...(provider ? { provider } : {}),
    ...(locationWarning ? { locationWarning } : {}),
    aqi,
    pm25: readOptionalFinite(payload.pm25) ?? 0,
    ...(pm10 !== undefined ? { pm10 } : {}),
    no2: readOptionalFinite(payload.no2) ?? 0,
    o3: readOptionalFinite(payload.o3) ?? 0,
    category: getAqiCategoryByValue(aqi).id,
    updatedAt,
    ...(hourlyPm25 && hourlyPm25.length > 0 ? { hourlyPm25 } : {}),
    source: 'live',
  };
}
