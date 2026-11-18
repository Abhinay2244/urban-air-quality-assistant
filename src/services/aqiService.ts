import { API_ENDPOINTS, APP_TEXT, ERROR_MESSAGES } from '../constants/config.ts';
import { type AQIData, ErrorCode } from '../types/index.ts';
import { getAQICategoryByValue } from '../utils/aqiCalculations.ts';
import { toAppError } from '../utils/errors.ts';
import {
  isRecord,
  unwrapValidation,
  validateCity,
  validateManualAqi,
  validateOptionalPm25,
} from '../utils/validation.ts';
import { fetchJsonOrThrow } from './httpClient.ts';

interface LiveAqiResponsePayload {
  city?: string;
  country?: string;
  aqi: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  o3?: number;
  updatedAt?: string;
}

const PM25_ESTIMATE_MULTIPLIER = 0.6;

function isLiveAqiPayload(raw: unknown): raw is LiveAqiResponsePayload {
  return isRecord(raw) && typeof raw.aqi === 'number' && Number.isFinite(raw.aqi);
}

function readOptionalFinite(raw: unknown): number {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

/**
 * Fetches live urban air quality metrics for a given city via the server AQI proxy.
 */
export async function fetchAQIDataByCity(city: string): Promise<AQIData> {
  const safeCity = unwrapValidation(validateCity(city), ERROR_MESSAGES.INVALID_CITY);

  try {
    const url = `${API_ENDPOINTS.AQI_LIVE}?city=${encodeURIComponent(safeCity)}`;
    const payload = await fetchJsonOrThrow(
      url,
      undefined,
      ErrorCode.AQI_FETCH_ERROR,
      ERROR_MESSAGES.AQI_FETCH_FAILED,
      isLiveAqiPayload,
    );

    const aqi = Math.round(payload.aqi);
    return {
      city: typeof payload.city === 'string' ? payload.city : safeCity,
      country: typeof payload.country === 'string' ? payload.country : APP_TEXT.DEFAULT_COUNTRY,
      aqi,
      pm25: readOptionalFinite(payload.pm25),
      pm10: readOptionalFinite(payload.pm10),
      no2: readOptionalFinite(payload.no2),
      o3: readOptionalFinite(payload.o3),
      category: getAQICategoryByValue(aqi).id,
      updatedAt:
        typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
      source: 'live',
    };
  } catch (error: unknown) {
    throw toAppError(error, ErrorCode.AQI_FETCH_ERROR, ERROR_MESSAGES.AQI_FETCH_FAILED);
  }
}

/**
 * Creates a validated AQIData object from user-entered manual AQI and optional PM2.5 values.
 */
export function createManualAQIData(city: string, aqiInput: number, pm25Input?: number): AQIData {
  const safeCity = unwrapValidation(validateCity(city), ERROR_MESSAGES.INVALID_CITY);
  const aqi = unwrapValidation(validateManualAqi(aqiInput), ERROR_MESSAGES.INVALID_MANUAL_AQI);
  const validatedPm25 = unwrapValidation(
    validateOptionalPm25(pm25Input),
    ERROR_MESSAGES.INVALID_MANUAL_PM25,
  );
  const safePm25 = validatedPm25 ?? Math.round(aqi * PM25_ESTIMATE_MULTIPLIER);

  return {
    city: safeCity,
    country: APP_TEXT.MANUAL_AQI_SOURCE_LABEL,
    aqi,
    pm25: safePm25,
    pm10: 0,
    no2: 0,
    o3: 0,
    category: getAQICategoryByValue(aqi).id,
    updatedAt: new Date().toISOString(),
    source: 'manual',
  };
}
