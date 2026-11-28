/**
 * @module services/citySearchService
 * Responsibility: Query /api/cities for India-only Open-Meteo geocoding suggestions.
 * Must not hold UI state or modify profile form values directly.
 */
import { API_ENDPOINTS, ERROR_MESSAGES } from '@shared/constants/http.ts';
import { type CitySearchResult, ErrorCode } from '@shared/types/index.ts';
import { isRecord } from '@shared/utils/typeGuards.ts';
import { fetchJsonOrThrow } from './httpClient.ts';

interface CitySearchPayload {
  cities: CitySearchResult[];
}

function isCitySearchItem(raw: unknown): raw is CitySearchResult {
  return (
    isRecord(raw) &&
    typeof raw.name === 'string' &&
    typeof raw.country === 'string' &&
    typeof raw.latitude === 'number' &&
    Number.isFinite(raw.latitude) &&
    typeof raw.longitude === 'number' &&
    Number.isFinite(raw.longitude)
  );
}

function isCitySearchPayload(raw: unknown): raw is CitySearchPayload {
  return isRecord(raw) && Array.isArray(raw.cities) && raw.cities.every(isCitySearchItem);
}

/**
 * Queries /api/cities for matching Indian cities filtered via Open-Meteo `countryCode=IN`.
 */
export async function searchIndianCitiesClient(
  query: string,
  signal?: AbortSignal,
): Promise<CitySearchResult[]> {
  const url = `${API_ENDPOINTS.CITIES_SEARCH}?q=${encodeURIComponent(query)}`;
  const payload = await fetchJsonOrThrow(url, {
    ...(signal !== undefined ? { init: { signal } } : {}),
    fallbackCode: ErrorCode.AQI_FETCH_ERROR,
    fallbackMessage: ERROR_MESSAGES.AQI_FETCH_FAILED,
    guard: isCitySearchPayload,
  });
  return payload.cities;
}
