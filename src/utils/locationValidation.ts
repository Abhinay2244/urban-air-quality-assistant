/**
 * @module utils/locationValidation
 * Responsibility: Check whether resolved stations sit inside India and within distance of requested locations.
 * Must not perform HTTP requests, access Express req/res objects, or manage React state.
 */
import { INDIA_GEO_BOUNDS, MAX_STATION_DISTANCE_KM } from '../constants/aqi.ts';
import type { Coordinates } from '../types/index.ts';

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Checks if latitude and longitude fall inside India's inclusive geographic bounding box.
 */
export function isInsideIndia(latitude: number, longitude: number): boolean {
  return (
    latitude >= INDIA_GEO_BOUNDS.MIN_LAT &&
    latitude <= INDIA_GEO_BOUNDS.MAX_LAT &&
    longitude >= INDIA_GEO_BOUNDS.MIN_LON &&
    longitude <= INDIA_GEO_BOUNDS.MAX_LON
  );
}

/**
 * Computes great-circle Haversine distance in kilometers between two coordinate pairs.
 */
export function computeHaversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = (b.latitude - a.latitude) * DEG_TO_RAD;
  const dLon = (b.longitude - a.longitude) * DEG_TO_RAD;
  const lat1 = a.latitude * DEG_TO_RAD;
  const lat2 = b.latitude * DEG_TO_RAD;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Parameters describing a resolved upstream monitoring station or place. */
export interface LocationCheckInput {
  resolvedPlace: string;
  country?: string;
  countryCode?: string;
  stationCoords?: Coordinates;
  requestedCoords?: Coordinates;
  requestedLabel?: string;
}

/**
 * Returns a visible user-facing warning if the resolved location is outside India or far from target.
 */
export function buildLocationWarning(input: LocationCheckInput): string | undefined {
  const { resolvedPlace, country, countryCode, stationCoords, requestedCoords, requestedLabel } =
    input;

  const isForeignCountryCode =
    typeof countryCode === 'string' &&
    countryCode.length > 0 &&
    countryCode.toUpperCase() !== INDIA_GEO_BOUNDS.COUNTRY_CODE;
  const isForeignCountryName =
    typeof country === 'string' &&
    country.length > 0 &&
    country !== 'Unknown' &&
    country.toLowerCase() !== INDIA_GEO_BOUNDS.COUNTRY_NAME.toLowerCase();
  const isOutsideIndiaCoords =
    stationCoords !== undefined && !isInsideIndia(stationCoords.latitude, stationCoords.longitude);

  if (isForeignCountryCode || isForeignCountryName || isOutsideIndiaCoords) {
    return `Warning: "${resolvedPlace}" appears to be outside India. Verify before using these readings.`;
  }

  if (stationCoords && requestedCoords) {
    const distanceKm = computeHaversineKm(requestedCoords, stationCoords);
    if (distanceKm > MAX_STATION_DISTANCE_KM) {
      const target = requestedLabel ?? 'your selected location';
      return `Warning: Nearest station "${resolvedPlace}" is ~${Math.round(distanceKm)} km from ${target} and may differ from local air.`;
    }
  }

  return undefined;
}
