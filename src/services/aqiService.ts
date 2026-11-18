import { API_ENDPOINTS, APP_TEXT, ERROR_MESSAGES, INPUT_LIMITS } from '../constants/config.ts';
import { type AQIData, ErrorCode } from '../types/index.ts';
import { createAppError, isAppError, toAppError } from '../utils/errors.ts';
import { getAQICategoryByValue } from '../utils/formatting.ts';
import { validateCity } from '../utils/validation.ts';

interface LiveAqiResponsePayload {
  city?: string;
  country?: string;
  aqi?: number;
  pm25?: number;
  pm10?: number;
  no2?: number;
  o3?: number;
  updatedAt?: string;
}

const PM25_ESTIMATE_MULTIPLIER = 0.6;

/**
 * Fetches live urban air quality metrics for a given city via the server AQI proxy.
 */
export async function fetchAQIDataByCity(city: string): Promise<AQIData> {
  const cityValidation = validateCity(city);
  if (!cityValidation.isValid || cityValidation.error) {
    throw (
      cityValidation.error ??
      createAppError(ErrorCode.VALIDATION_ERROR, ERROR_MESSAGES.INVALID_CITY)
    );
  }

  try {
    const url = `${API_ENDPOINTS.AQI_LIVE}?city=${encodeURIComponent(cityValidation.value)}`;
    const response = await fetch(url);
    if (!response.ok) {
      const errorPayload: unknown = await response.json().catch(() => null);
      if (isAppError(errorPayload)) {
        throw errorPayload;
      }
      throw createAppError(ErrorCode.AQI_FETCH_ERROR, ERROR_MESSAGES.AQI_FETCH_FAILED);
    }

    const payload = (await response.json()) as LiveAqiResponsePayload;
    if (typeof payload.aqi !== 'number' || !Number.isFinite(payload.aqi)) {
      throw createAppError(ErrorCode.AQI_FETCH_ERROR, ERROR_MESSAGES.AQI_FETCH_FAILED);
    }

    const aqi = Math.round(payload.aqi);
    return {
      city: payload.city ?? cityValidation.value,
      country: payload.country ?? APP_TEXT.DEFAULT_COUNTRY,
      aqi,
      pm25: payload.pm25 ?? 0,
      pm10: payload.pm10 ?? 0,
      no2: payload.no2 ?? 0,
      o3: payload.o3 ?? 0,
      category: getAQICategoryByValue(aqi).id,
      updatedAt: payload.updatedAt ?? new Date().toISOString(),
      source: 'live',
    };
  } catch (error: unknown) {
    throw toAppError(error, ErrorCode.AQI_FETCH_ERROR, ERROR_MESSAGES.AQI_FETCH_FAILED);
  }
}

/**
 * Creates a validated AQIData object from user-entered manual AQI values.
 */
export function createManualAQIData(city: string, aqiInput: number, pm25Input?: number): AQIData {
  const cityValidation = validateCity(city);
  if (!cityValidation.isValid || cityValidation.error) {
    throw (
      cityValidation.error ??
      createAppError(ErrorCode.VALIDATION_ERROR, ERROR_MESSAGES.INVALID_CITY)
    );
  }

  if (
    !Number.isFinite(aqiInput) ||
    aqiInput < INPUT_LIMITS.MIN_AQI_VALUE ||
    aqiInput > INPUT_LIMITS.MAX_AQI_VALUE
  ) {
    throw createAppError(ErrorCode.VALIDATION_ERROR, ERROR_MESSAGES.INVALID_MANUAL_AQI);
  }

  const aqi = Math.round(aqiInput);
  const safePm25 =
    typeof pm25Input === 'number' &&
    Number.isFinite(pm25Input) &&
    pm25Input >= 0 &&
    pm25Input <= INPUT_LIMITS.MAX_PM25_VALUE
      ? pm25Input
      : Math.round(aqi * PM25_ESTIMATE_MULTIPLIER);

  return {
    city: cityValidation.value,
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
