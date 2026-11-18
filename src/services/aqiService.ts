import { API_ENDPOINTS, APP_TEXT, ERROR_MESSAGES } from '../constants/config.ts';
import { type AQIData, ErrorCode } from '../types/index.ts';
import { createAppError, toAppError } from '../utils/errors.ts';
import { getAQICategoryByValue } from '../utils/formatting.ts';
import { validateCity } from '../utils/validation.ts';

interface GeocodingResponse {
  results?: Array<{
    name?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }>;
}

interface AirQualityResponse {
  current?: {
    time?: string;
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    nitrogen_dioxide?: number;
    ozone?: number;
  };
}

const GEOCODING_QUERY_COUNT = 1;
const AIR_QUALITY_CURRENT_PARAMS = 'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone';

/**
 * Fetches live urban air quality metrics for a given city via Open-Meteo APIs.
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
    const geoUrl = `${API_ENDPOINTS.GEOCODING}?name=${encodeURIComponent(cityValidation.value)}&count=${GEOCODING_QUERY_COUNT}&language=en&format=json`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) {
      throw createAppError(ErrorCode.AQI_FETCH_ERROR, ERROR_MESSAGES.AQI_FETCH_FAILED);
    }

    const geoData = (await geoRes.json()) as GeocodingResponse;
    const location = geoData.results?.[0];
    if (
      !location ||
      typeof location.latitude !== 'number' ||
      typeof location.longitude !== 'number'
    ) {
      throw createAppError(ErrorCode.CITY_NOT_FOUND, ERROR_MESSAGES.CITY_NOT_FOUND);
    }

    const aqiUrl = `${API_ENDPOINTS.AIR_QUALITY}?latitude=${location.latitude}&longitude=${location.longitude}&current=${AIR_QUALITY_CURRENT_PARAMS}`;
    const aqiRes = await fetch(aqiUrl);
    if (!aqiRes.ok) {
      throw createAppError(ErrorCode.AQI_FETCH_ERROR, ERROR_MESSAGES.AQI_FETCH_FAILED);
    }

    const aqiPayload = (await aqiRes.json()) as AirQualityResponse;
    const current = aqiPayload.current;
    if (!current || typeof current.us_aqi !== 'number') {
      throw createAppError(ErrorCode.AQI_FETCH_ERROR, ERROR_MESSAGES.AQI_FETCH_FAILED);
    }

    const aqi = Math.round(current.us_aqi);
    return {
      city: location.name ?? cityValidation.value,
      country: location.country ?? APP_TEXT.DEFAULT_COUNTRY,
      aqi,
      pm25: current.pm2_5 ?? 0,
      pm10: current.pm10 ?? 0,
      no2: current.nitrogen_dioxide ?? 0,
      o3: current.ozone ?? 0,
      category: getAQICategoryByValue(aqi).id,
      updatedAt: current.time ?? new Date().toISOString(),
    };
  } catch (error: unknown) {
    throw toAppError(error, ErrorCode.AQI_FETCH_ERROR, ERROR_MESSAGES.AQI_FETCH_FAILED);
  }
}
