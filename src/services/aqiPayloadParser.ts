/**
 * @module services/aqiPayloadParser
 * Responsibility: Validate and normalize raw JSON responses from /api/aqi into typed AqiData.
 * Must not invoke fetch, manage UI state, or throw raw syntax errors.
 */
import { INPUT_LIMITS } from '@shared/constants/limits.ts';
import { DEFAULT_COUNTRY } from '@shared/constants/server.ts';
import type { AqiData, AqiProvider, HourlyPm25Point } from '@shared/types/index.ts';
import { getAqiCategoryByValue } from '../utils/aqiCalculations.ts';
import { sanitizeText } from '@shared/utils/sanitizing.ts';
import { isHourlyPm25Array, isOneOf, isRecord } from '@shared/utils/typeGuards.ts';

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

function readOptionalSanitizedText(raw: unknown, maxLength: number): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const clean = sanitizeText(raw, maxLength);
  return clean.length > 0 ? clean : undefined;
}

function resolveCityName(rawCity: unknown, fallbackCity: string): string {
  const cleanCity = readOptionalSanitizedText(rawCity, INPUT_LIMITS.MAX_CITY_LENGTH);
  if (cleanCity && cleanCity.length >= INPUT_LIMITS.MIN_CITY_LENGTH) {
    return cleanCity;
  }
  return sanitizeText(fallbackCity, INPUT_LIMITS.MAX_CITY_LENGTH);
}

function extractLiveOptionalFields(
  payload: LiveAqiResponsePayload,
): Pick<AqiData, 'stationName' | 'provider' | 'locationWarning' | 'pm10' | 'hourlyPm25'> {
  const pm10 = readOptionalFinite(payload.pm10);
  const hourly = isHourlyPm25Array(payload.hourlyPm25) ? payload.hourlyPm25 : undefined;
  const provider = isOneOf(payload.provider, PROVIDERS) ? payload.provider : undefined;
  const stationName = readOptionalSanitizedText(payload.stationName, INPUT_LIMITS.MAX_TEXT_LENGTH);
  const locationWarning = readOptionalSanitizedText(
    payload.locationWarning,
    INPUT_LIMITS.MAX_TEXT_LENGTH,
  );
  return {
    ...(stationName !== undefined ? { stationName } : {}),
    ...(provider !== undefined ? { provider } : {}),
    ...(locationWarning !== undefined ? { locationWarning } : {}),
    ...(pm10 !== undefined ? { pm10 } : {}),
    ...(hourly && hourly.length > 0 ? { hourlyPm25: hourly } : {}),
  };
}

/** Normalizes a validated /api/aqi response payload into AqiData without capping live AQI > 500. */
export function normalizeLiveAqiPayload(
  payload: LiveAqiResponsePayload,
  fallbackCity: string,
): AqiData {
  const aqi = Math.round(payload.aqi);
  const country = readOptionalSanitizedText(payload.country, INPUT_LIMITS.MAX_CITY_LENGTH);
  const updatedAt = readOptionalSanitizedText(payload.updatedAt, INPUT_LIMITS.MAX_CITY_LENGTH);

  return {
    city: resolveCityName(payload.city, fallbackCity),
    country: country ?? DEFAULT_COUNTRY,
    aqi,
    pm25: readOptionalFinite(payload.pm25) ?? 0,
    no2: readOptionalFinite(payload.no2) ?? 0,
    o3: readOptionalFinite(payload.o3) ?? 0,
    category: getAqiCategoryByValue(aqi).id,
    updatedAt: updatedAt ?? new Date().toISOString(),
    source: 'live',
    ...extractLiveOptionalFields(payload),
  };
}
