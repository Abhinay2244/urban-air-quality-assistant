/**
 * @module utils/validation
 * Responsibility: Validate and sanitize user profile, manual AQI/PM2.5 inputs, and AqiData payloads.
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
import { isOneOf, isRecord } from './typeGuards.ts';

/**
 * Result returned by validation helpers.
 */
export interface ValidationResult<T> {
  isValid: boolean;
  value: T;
  error?: AppError;
}

const FAMILY_VALUES: readonly FamilyType[] = Object.values(FamilyType);
const COMMUTE_VALUES: readonly CommuteMode[] = Object.values(CommuteMode);
const HOME_VALUES: readonly HomeType[] = Object.values(HomeType);
const AQI_CATEGORY_VALUES: readonly AqiCategoryId[] = Object.values(AqiCategoryId);

function fail<T>(value: T, message: string): ValidationResult<T> {
  return { isValid: false, value, error: createAppError(ErrorCode.VALIDATION_ERROR, message) };
}

function isBoundedFinite(val: unknown, max: number): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0 && val <= max;
}

/**
 * Extracts a validated value or throws its typed validation AppError.
 */
export function unwrapValidation<T>(result: ValidationResult<T>, fallbackMessage: string): T {
  if (!result.isValid) {
    throw result.error ?? createAppError(ErrorCode.VALIDATION_ERROR, fallbackMessage);
  }
  return result.value;
}

/**
 * Validates and sanitizes a user-entered city name.
 */
export function validateCity(city: string): ValidationResult<string> {
  const sanitized = sanitizeText(city, INPUT_LIMITS.MAX_CITY_LENGTH);
  if (sanitized.length < INPUT_LIMITS.MIN_CITY_LENGTH) {
    return fail(sanitized, ERROR_MESSAGES.INVALID_CITY);
  }
  return { isValid: true, value: sanitized };
}

/**
 * Validates and sanitizes a US AQI numeric or string entry within [0, 500].
 */
export function validateManualAqi(raw: string | number): ValidationResult<number> {
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  const empty = typeof raw === 'string' && raw.trim() === '';
  if (empty || !isBoundedFinite(parsed, INPUT_LIMITS.MAX_AQI_VALUE)) {
    return fail(INPUT_LIMITS.MIN_AQI_VALUE, ERROR_MESSAGES.INVALID_MANUAL_AQI);
  }
  return { isValid: true, value: Math.round(parsed) };
}

/**
 * Validates an optional PM2.5 reading (empty/undefined allowed, otherwise 0 to 1000 ug/m3).
 */
export function validateOptionalPm25(
  raw: string | number | undefined,
): ValidationResult<number | undefined> {
  if (raw === undefined || (typeof raw === 'string' && raw.trim() === '')) {
    return { isValid: true, value: undefined };
  }
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  if (!isBoundedFinite(parsed, INPUT_LIMITS.MAX_PM25_VALUE)) {
    return fail(undefined, ERROR_MESSAGES.INVALID_MANUAL_PM25);
  }
  return { isValid: true, value: parsed };
}

/**
 * Validates an unknown payload against UserProfile and sanitizes city text.
 */
export function validateUserProfile(profile: unknown): ValidationResult<UserProfile> {
  if (!isRecord(profile) || typeof profile.city !== 'string') {
    return fail(DEFAULT_USER_PROFILE, ERROR_MESSAGES.INVALID_REQUEST_BODY);
  }
  if (
    !isOneOf(profile.familyType, FAMILY_VALUES) ||
    !isOneOf(profile.commuteMode, COMMUTE_VALUES) ||
    !isOneOf(profile.homeType, HOME_VALUES) ||
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

/**
 * Type guard verifying an unknown payload represents valid AqiData.
 */
export function validateAqiData(data: unknown): data is AqiData {
  if (!isRecord(data)) return false;
  return (
    typeof data.city === 'string' &&
    data.city.trim().length > 0 &&
    typeof data.country === 'string' &&
    isBoundedFinite(data.aqi, INPUT_LIMITS.MAX_AQI_VALUE) &&
    isBoundedFinite(data.pm25, Number.MAX_SAFE_INTEGER) &&
    isBoundedFinite(data.pm10, Number.MAX_SAFE_INTEGER) &&
    isBoundedFinite(data.no2, Number.MAX_SAFE_INTEGER) &&
    isBoundedFinite(data.o3, Number.MAX_SAFE_INTEGER) &&
    typeof data.updatedAt === 'string' &&
    isOneOf(data.category, AQI_CATEGORY_VALUES)
  );
}
