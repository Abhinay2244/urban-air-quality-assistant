/**
 * @module utils/validation
 * Responsibility: Validate user profiles, manual AQI/PM inputs (0-500), and re-export validateAqiData.
 * Must not call network APIs, access Express req/res objects, or manage React component state.
 */
import { DEFAULT_USER_PROFILE } from '../constants/config.ts';
import { ERROR_MESSAGES } from '../constants/http.ts';
import { INPUT_LIMITS } from '../constants/limits.ts';
import {
  type AppError,
  CommuteMode,
  ErrorCode,
  FamilyType,
  HomeType,
  type UserProfile,
} from '../types/index.ts';
import { validateAqiData } from './aqiValidation.ts';
import { createAppError, toAppError } from './errors.ts';
import { sanitizeText } from './sanitizing.ts';
import { isBoundedFinite, isOneOf, isRecord } from './typeGuards.ts';

export { validateAqiData };

/** Result returned by validation helpers. */
export interface ValidationResult<T> {
  isValid: boolean;
  value: T;
  error?: AppError;
}

type OptionalNumericInput = string | number | undefined;

const fail = <T>(value: T, message: string): ValidationResult<T> => ({
  isValid: false,
  value,
  error: createAppError(ErrorCode.VALIDATION_ERROR, message),
});

function validateOptionalParticulate(
  raw: OptionalNumericInput,
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
  if (!result.isValid) throw toAppError(result.error, ErrorCode.VALIDATION_ERROR, fallbackMessage);
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
  raw: OptionalNumericInput,
): ValidationResult<number | undefined> {
  return validateOptionalParticulate(
    raw,
    INPUT_LIMITS.MAX_PM25_VALUE,
    ERROR_MESSAGES.INVALID_MANUAL_PM25,
  );
}

/** Validates an optional PM10 reading (empty/undefined allowed, otherwise 0 to 2000 ug/m3). */
export function validateOptionalPm10(
  raw: OptionalNumericInput,
): ValidationResult<number | undefined> {
  return validateOptionalParticulate(
    raw,
    INPUT_LIMITS.MAX_PM10_VALUE,
    ERROR_MESSAGES.INVALID_MANUAL_PM10,
  );
}

function isProfileRecord(profile: unknown): profile is UserProfile {
  return (
    isRecord(profile) &&
    typeof profile.city === 'string' &&
    isOneOf(profile.familyType, Object.values(FamilyType)) &&
    isOneOf(profile.commuteMode, Object.values(CommuteMode)) &&
    isOneOf(profile.homeType, Object.values(HomeType)) &&
    typeof profile.hasChildren === 'boolean' &&
    typeof profile.hasElderly === 'boolean' &&
    typeof profile.hasRespiratoryCondition === 'boolean'
  );
}

/** Validates an unknown payload against UserProfile and sanitizes city text. */
export function validateUserProfile(profile: unknown): ValidationResult<UserProfile> {
  if (!isProfileRecord(profile)) {
    return fail(DEFAULT_USER_PROFILE, ERROR_MESSAGES.INVALID_REQUEST_BODY);
  }
  const cityResult = validateCity(profile.city);
  const sanitized: UserProfile = { ...profile, city: cityResult.value };
  if (cityResult.isValid) return { isValid: true, value: sanitized };
  return {
    isValid: false,
    value: sanitized,
    ...(cityResult.error !== undefined ? { error: cityResult.error } : {}),
  };
}
