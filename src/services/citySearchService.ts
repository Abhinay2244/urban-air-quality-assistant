/**
 * @module services/citySearchService
 * Responsibility: Query /api/cities for India-only Open-Meteo geocoding suggestions.
 * Must not hold UI state or modify profile form values directly.
 */
import { API_ENDPOINTS, ERROR_MESSAGES } from '../constants/http.ts';
import { type CitySearchResult, ErrorCode } from '../types/index.ts';
import { isRecord } from '../utils/typeGuards.ts';
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
  const payload = await fetchJsonOrThrow(
    url,
    { signal },
    ErrorCode.AQI_FETCH_ERROR,
    ERROR_MESSAGES.AQI_FETCH_FAILED,
    isCitySearchPayload,
  );
  return payload.cities;
}
