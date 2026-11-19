/**
 * @module services/aqiService
 * Responsibility: Fetch live city AQI readings from /api/aqi and construct validated manual AqiData.
 * Must not manage UI state, render components, or access server API keys directly.
 */
import { APP_TEXT } from '../constants/config.ts';
import { API_ENDPOINTS, ERROR_MESSAGES } from '../constants/http.ts';
import { DEFAULT_COUNTRY } from '../constants/server.ts';
import { type AqiData, ErrorCode } from '../types/index.ts';
import { getAqiCategoryByValue } from '../utils/aqiCalculations.ts';
import { toAppError } from '../utils/errors.ts';
import { isRecord } from '../utils/typeGuards.ts';
import {
  unwrapValidation,
  validateCity,
  validateManualAqi,
  validateOptionalPm25,
} from '../utils/validation.ts';
import { fetchJsonOrThrow, isAbortError } from './httpClient.ts';

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

// Why: When users enter only US AQI manually, 0.6 approximates fine particulate ug/m3
// across moderate-to-unhealthy urban smog ranges so WHO guideline comparisons stay populated.
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
export async function fetchAqiDataByCity(city: string, signal?: AbortSignal): Promise<AqiData> {
  const safeCity = unwrapValidation(validateCity(city), ERROR_MESSAGES.INVALID_CITY);

  try {
    const url = `${API_ENDPOINTS.AQI_LIVE}?city=${encodeURIComponent(safeCity)}`;
    const payload = await fetchJsonOrThrow(
      url,
      { signal },
      ErrorCode.AQI_FETCH_ERROR,
      ERROR_MESSAGES.AQI_FETCH_FAILED,
      isLiveAqiPayload,
    );

    const aqi = Math.round(payload.aqi);
    return {
      city: typeof payload.city === 'string' ? payload.city : safeCity,
      country: typeof payload.country === 'string' ? payload.country : DEFAULT_COUNTRY,
      aqi,
      pm25: readOptionalFinite(payload.pm25),
      pm10: readOptionalFinite(payload.pm10),
      no2: readOptionalFinite(payload.no2),
      o3: readOptionalFinite(payload.o3),
      category: getAqiCategoryByValue(aqi).id,
      updatedAt:
        typeof payload.updatedAt === 'string' ? payload.updatedAt : new Date().toISOString(),
      source: 'live',
    };
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }
    throw toAppError(error, ErrorCode.AQI_FETCH_ERROR, ERROR_MESSAGES.AQI_FETCH_FAILED);
  }
}

/**
 * Creates a validated AqiData object from user-entered manual AQI and optional PM2.5 values.
 */
export function createManualAqiData(city: string, aqiInput: number, pm25Input?: number): AqiData {
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
    category: getAqiCategoryByValue(aqi).id,
    updatedAt: new Date().toISOString(),
    source: 'manual',
  };
}
