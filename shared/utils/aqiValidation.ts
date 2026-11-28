/**
 * @module utils/aqiValidation
 * Responsibility: Validate live and manual AqiData structures (live readings above 500 permitted).
 * Must not call network APIs, access Express req/res objects, or manage React state.
 */
import { INPUT_LIMITS } from '../constants/limits.ts';
import { AqiCategoryId, type AqiData } from '../types/index.ts';
import { sanitizeText } from './sanitizing.ts';
import { isBoundedFinite, isHourlyPm25Array, isOneOf, isRecord } from './typeGuards.ts';

function hasValidAqiNumbers(data: Record<string, unknown>): boolean {
  const isOptNum = (v: unknown): boolean =>
    v === undefined || isBoundedFinite(v, Number.MAX_SAFE_INTEGER);
  return (
    isBoundedFinite(data.aqi, Number.MAX_SAFE_INTEGER) &&
    isBoundedFinite(data.pm25, Number.MAX_SAFE_INTEGER) &&
    isOptNum(data.pm10) &&
    isOptNum(data.no2) &&
    isOptNum(data.o3)
  );
}

function hasValidAqiMetadata(data: Record<string, unknown>): boolean {
  const isOptText = (v: unknown): boolean => v === undefined || typeof v === 'string';
  const validProvider =
    data.provider === undefined || data.provider === 'waqi' || data.provider === 'open-meteo';
  return (
    typeof data.city === 'string' &&
    sanitizeText(data.city, INPUT_LIMITS.MAX_CITY_LENGTH).length > 0 &&
    typeof data.country === 'string' &&
    isOptText(data.stationName) &&
    isOptText(data.locationWarning) &&
    isOptText(data.updatedAt) &&
    validProvider
  );
}

/** Type guard verifying an unknown payload represents valid AqiData (live AQI above 500 permitted). */
export function validateAqiData(data: unknown): data is AqiData {
  if (!isRecord(data)) return false;
  return (
    hasValidAqiMetadata(data) &&
    hasValidAqiNumbers(data) &&
    isOneOf(data.category, Object.values(AqiCategoryId)) &&
    (data.hourlyPm25 === undefined || isHourlyPm25Array(data.hourlyPm25))
  );
}
