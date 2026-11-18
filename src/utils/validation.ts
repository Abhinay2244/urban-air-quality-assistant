import { ERROR_MESSAGES, INPUT_LIMITS } from '../constants/config.ts';
import {
  type AppError,
  AQICategoryId,
  type AQIData,
  CommuteMode,
  ErrorCode,
  FamilyType,
  HomeType,
  type UserProfile,
} from '../types/index.ts';
import { createAppError } from './errors.ts';
import { sanitizeText } from './sanitizing.ts';

/**
 * Result returned by validation helpers.
 */
export interface ValidationResult<T> {
  isValid: boolean;
  value: T;
  error?: AppError;
}

/**
 * Validates and sanitizes a user-entered city name.
 */
export function validateCity(city: string): ValidationResult<string> {
  const sanitized = sanitizeText(city, INPUT_LIMITS.MAX_CITY_LENGTH);
  if (sanitized.length < INPUT_LIMITS.MIN_CITY_LENGTH) {
    return {
      isValid: false,
      value: sanitized,
      error: createAppError(ErrorCode.VALIDATION_ERROR, ERROR_MESSAGES.INVALID_CITY),
    };
  }

  return { isValid: true, value: sanitized };
}

/**
 * Validates and sanitizes an entire UserProfile object.
 */
export function validateUserProfile(profile: UserProfile): ValidationResult<UserProfile> {
  const cityResult = validateCity(profile.city);
  const sanitizedProfile: UserProfile = {
    city: cityResult.value,
    familyType: Object.values(FamilyType).includes(profile.familyType)
      ? profile.familyType
      : FamilyType.NUCLEAR,
    hasChildren: Boolean(profile.hasChildren),
    hasElderly: Boolean(profile.hasElderly),
    hasRespiratoryCondition: Boolean(profile.hasRespiratoryCondition),
    commuteMode: Object.values(CommuteMode).includes(profile.commuteMode)
      ? profile.commuteMode
      : CommuteMode.PUBLIC_TRANSIT,
    homeType: Object.values(HomeType).includes(profile.homeType)
      ? profile.homeType
      : HomeType.APARTMENT,
  };

  if (!cityResult.isValid) {
    return { isValid: false, value: sanitizedProfile, error: cityResult.error };
  }

  return { isValid: true, value: sanitizedProfile };
}

/**
 * Type guard verifying an unknown payload represents valid AQIData.
 */
export function validateAQIData(data: unknown): data is AQIData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const candidate = data as Record<string, unknown>;
  return (
    typeof candidate.city === 'string' &&
    candidate.city.trim().length > 0 &&
    typeof candidate.country === 'string' &&
    typeof candidate.aqi === 'number' &&
    Number.isFinite(candidate.aqi) &&
    typeof candidate.pm25 === 'number' &&
    Number.isFinite(candidate.pm25) &&
    typeof candidate.category === 'string' &&
    Object.values(AQICategoryId).includes(candidate.category as AQICategoryId)
  );
}
