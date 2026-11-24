/**
 * @module services/aqiService
 * Responsibility: Fetch live city/coordinate AQI readings from /api/aqi and construct manual AqiData.
 * Must not manage UI state, render components, or access server API keys directly.
 */
import { APP_TEXT } from '../constants/config.ts';
import { API_ENDPOINTS, ERROR_MESSAGES } from '../constants/http.ts';
import { type AqiData, type Coordinates, ErrorCode } from '../types/index.ts';
import { getAqiCategoryByValue } from '../utils/aqiCalculations.ts';
import { toAppError } from '../utils/errors.ts';
import {
  unwrapValidation,
  validateCity,
  validateManualAqi,
  validateOptionalPm10,
  validateOptionalPm25,
} from '../utils/validation.ts';
import { isLiveAqiPayload, normalizeLiveAqiPayload } from './aqiPayloadParser.ts';
import { fetchJsonOrThrow, isAbortError } from './httpClient.ts';

// Why: When a user enters manual AQI without a PM2.5 sensor, 0.6x approximates typical urban
// fine-particulate ug/m3 levels so prompt context and impact summaries remain grounded.
const PM25_ESTIMATE_MULTIPLIER = 0.6;

/**
 * Fetches live air quality metrics for a city (and optional selected coordinates) via /api/aqi.
 */
export async function fetchAqiDataByCity(
  city: string,
  signal?: AbortSignal,
  coords?: Coordinates,
): Promise<AqiData> {
  const safeCity = unwrapValidation(validateCity(city), ERROR_MESSAGES.INVALID_CITY);
  const query = coords
    ? `lat=${coords.latitude}&lon=${coords.longitude}&city=${encodeURIComponent(safeCity)}`
    : `city=${encodeURIComponent(safeCity)}`;

  try {
    const payload = await fetchJsonOrThrow(
      `${API_ENDPOINTS.AQI_LIVE}?${query}`,
      { signal },
      ErrorCode.AQI_FETCH_ERROR,
      ERROR_MESSAGES.AQI_FETCH_FAILED,
      isLiveAqiPayload,
    );
    return normalizeLiveAqiPayload(payload, safeCity);
  } catch (error: unknown) {
    if (isAbortError(error)) throw error;
    throw toAppError(error, ErrorCode.AQI_FETCH_ERROR, ERROR_MESSAGES.AQI_FETCH_FAILED);
  }
}

/**
 * Fetches live air quality metrics for browser geolocation coordinates via /api/aqi.
 */
export async function fetchAqiDataByCoordinates(
  coords: Coordinates,
  signal?: AbortSignal,
): Promise<AqiData> {
  try {
    const url = `${API_ENDPOINTS.AQI_LIVE}?lat=${coords.latitude}&lon=${coords.longitude}`;
    const payload = await fetchJsonOrThrow(
      url,
      { signal },
      ErrorCode.AQI_FETCH_ERROR,
      ERROR_MESSAGES.AQI_FETCH_FAILED,
      isLiveAqiPayload,
    );
    return normalizeLiveAqiPayload(payload, APP_TEXT.DEFAULT_LOCATION_CITY);
  } catch (error: unknown) {
    if (isAbortError(error)) throw error;
    throw toAppError(error, ErrorCode.AQI_FETCH_ERROR, ERROR_MESSAGES.AQI_FETCH_FAILED);
  }
}

/**
 * Creates a validated AqiData object from manual AQI (0–500) and optional PM2.5/PM10 values.
 */
export function createManualAqiData(
  city: string,
  aqiInput: number,
  pm25Input?: number,
  pm10Input?: number,
): AqiData {
  const safeCity = unwrapValidation(validateCity(city), ERROR_MESSAGES.INVALID_CITY);
  const aqi = unwrapValidation(validateManualAqi(aqiInput), ERROR_MESSAGES.INVALID_MANUAL_AQI);
  const validatedPm25 = unwrapValidation(
    validateOptionalPm25(pm25Input),
    ERROR_MESSAGES.INVALID_MANUAL_PM25,
  );
  const validatedPm10 = unwrapValidation(
    validateOptionalPm10(pm10Input),
    ERROR_MESSAGES.INVALID_MANUAL_PM10,
  );
  const safePm25 = validatedPm25 ?? Math.round(aqi * PM25_ESTIMATE_MULTIPLIER);

  return {
    city: safeCity,
    country: APP_TEXT.MANUAL_AQI_SOURCE_LABEL,
    stationName: safeCity,
    aqi,
    pm25: safePm25,
    ...(validatedPm10 !== undefined ? { pm10: validatedPm10 } : {}),
    no2: 0,
    o3: 0,
    category: getAqiCategoryByValue(aqi).id,
    updatedAt: new Date().toISOString(),
    source: 'manual',
  };
}
