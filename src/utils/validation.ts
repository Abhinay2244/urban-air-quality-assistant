/**
 * @module utils/validation
 * Responsibility: Validate user profiles, manual AQI/PM inputs (0-500), and live AqiData (>500 allowed).
 * Must not call network APIs, access Express req/res objects, or manage React component state.
 */
import { DEFAULT_USER_PROFILE } from '../constants/config.ts';
import { ERROR_MESSAGES } from '../constants/http.ts';
import { INPUT_LIMITS } from '../constants/limits.ts';
import {
  type AppError,
  AqiCategoryId,
  type AqiData,
  CommuteMode,
  ErrorCode,
  FamilyType,
  HomeType,
  type UserProfile,
} from '../types/index.ts';
import { createAppError } from './errors.ts';
import { sanitizeText } from './sanitizing.ts';
import { isBoundedFinite, isHourlyPm25Array, isOneOf, isRecord } from './typeGuards.ts';

/** Result returned by validation helpers. */
export interface ValidationResult<T> {
  isValid: boolean;
  value: T;
  error?: AppError;
}

function fail<T>(value: T, message: string): ValidationResult<T> {
  return { isValid: false, value, error: createAppError(ErrorCode.VALIDATION_ERROR, message) };
}

function validateOptionalParticulate(
  raw: string | number | undefined,
  maxValue: number,
  errorMessage: string,
): ValidationResult<number | undefined> {
  if (raw === undefined || (typeof raw === 'string' && raw.trim() === '')) {
    return { isValid: true, value: undefined };
  }
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  return isBoundedFinite(parsed, maxValue)
    ? { isValid: true, value: parsed }
    : fail(undefined, errorMessage);
}

/** Extracts a validated value or throws its typed validation AppError. */
export function unwrapValidation<T>(result: ValidationResult<T>, fallbackMessage: string): T {
  if (!result.isValid) {
    throw result.error ?? createAppError(ErrorCode.VALIDATION_ERROR, fallbackMessage);
  }
  return result.value;
}

/** Validates and sanitizes a user-entered city name. */
export function validateCity(city: string): ValidationResult<string> {
  const sanitized = sanitizeText(city, INPUT_LIMITS.MAX_CITY_LENGTH);
  return sanitized.length < INPUT_LIMITS.MIN_CITY_LENGTH
    ? fail(sanitized, ERROR_MESSAGES.INVALID_CITY)
    : { isValid: true, value: sanitized };
}

/** Validates and sanitizes a manual AQI entry strictly within [0, 500]. */
export function validateManualAqi(raw: string | number): ValidationResult<number> {
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  const empty = typeof raw === 'string' && raw.trim() === '';
  return empty || !isBoundedFinite(parsed, INPUT_LIMITS.MAX_AQI_VALUE)
    ? fail(INPUT_LIMITS.MIN_AQI_VALUE, ERROR_MESSAGES.INVALID_MANUAL_AQI)
    : { isValid: true, value: Math.round(parsed) };
}

/** Validates an optional PM2.5 reading (empty/undefined allowed, otherwise 0 to 1000 ug/m3). */
export function validateOptionalPm25(
  raw: string | number | undefined,
): ValidationResult<number | undefined> {
  return validateOptionalParticulate(
    raw,
    INPUT_LIMITS.MAX_PM25_VALUE,
    ERROR_MESSAGES.INVALID_MANUAL_PM25,
  );
}

/** Validates an optional PM10 reading (empty/undefined allowed, otherwise 0 to 2000 ug/m3). */
export function validateOptionalPm10(
  raw: string | number | undefined,
): ValidationResult<number | undefined> {
  return validateOptionalParticulate(
    raw,
    INPUT_LIMITS.MAX_PM10_VALUE,
    ERROR_MESSAGES.INVALID_MANUAL_PM10,
  );
}

/** Validates an unknown payload against UserProfile and sanitizes city text. */
export function validateUserProfile(profile: unknown): ValidationResult<UserProfile> {
  if (
    !isRecord(profile) ||
    typeof profile.city !== 'string' ||
    !isOneOf(profile.familyType, Object.values(FamilyType)) ||
    !isOneOf(profile.commuteMode, Object.values(CommuteMode)) ||
    !isOneOf(profile.homeType, Object.values(HomeType)) ||
    typeof profile.hasChildren !== 'boolean' ||
    typeof profile.hasElderly !== 'boolean' ||
    typeof profile.hasRespiratoryCondition !== 'boolean'
  ) {
    return fail(DEFAULT_USER_PROFILE, ERROR_MESSAGES.INVALID_REQUEST_BODY);
  }

  const cityResult = validateCity(profile.city);
  const sanitized: UserProfile = {
    city: cityResult.value,
    familyType: profile.familyType,
    hasChildren: profile.hasChildren,
    hasElderly: profile.hasElderly,
    hasRespiratoryCondition: profile.hasRespiratoryCondition,
    commuteMode: profile.commuteMode,
    homeType: profile.homeType,
  };
  return cityResult.isValid
    ? { isValid: true, value: sanitized }
    : { isValid: false, value: sanitized, error: cityResult.error };
}

/** Type guard verifying an unknown payload represents valid AqiData (live AQI above 500 permitted). */
export function validateAqiData(data: unknown): data is AqiData {
  if (!isRecord(data)) return false;
  const optText = (v: unknown): boolean => v === undefined || typeof v === 'string';
  const optNum = (v: unknown): boolean =>
    v === undefined || isBoundedFinite(v, Number.MAX_SAFE_INTEGER);
  return (
    typeof data.city === 'string' &&
    sanitizeText(data.city, INPUT_LIMITS.MAX_CITY_LENGTH).length > 0 &&
    typeof data.country === 'string' &&
    optText(data.stationName) &&
    (data.provider === undefined || data.provider === 'waqi' || data.provider === 'open-meteo') &&
    optText(data.locationWarning) &&
    isBoundedFinite(data.aqi, Number.MAX_SAFE_INTEGER) &&
    isBoundedFinite(data.pm25, Number.MAX_SAFE_INTEGER) &&
    optNum(data.pm10) &&
    optNum(data.no2) &&
    optNum(data.o3) &&
    optText(data.updatedAt) &&
    isOneOf(data.category, Object.values(AqiCategoryId)) &&
    (data.hourlyPm25 === undefined || isHourlyPm25Array(data.hourlyPm25))
  );
}
