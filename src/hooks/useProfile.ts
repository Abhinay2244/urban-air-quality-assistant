import { useCallback, useState } from 'react';
import { DEFAULT_USER_PROFILE } from '../constants/config.ts';
import type { AppError, UserProfile } from '../types/index.ts';
import { validateCity, validateUserProfile } from '../utils/validation.ts';

/**
 * Per-field inline validation errors for UserProfile.
 */
export type ProfileFieldErrors = Partial<Record<keyof UserProfile, AppError>>;

/**
 * Return value of the useProfile custom hook.
 */
export interface UseProfileResult {
  profile: UserProfile;
  validationError: AppError | null;
  fieldErrors: ProfileFieldErrors;
  updateField: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => void;
  validateProfile: () => UserProfile | null;
}

/**
 * Manages household profile state and live field validation.
 */
export function useProfile(initialProfile: UserProfile = DEFAULT_USER_PROFILE): UseProfileResult {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [validationError, setValidationError] = useState<AppError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});

  const updateField = useCallback(
    <K extends keyof UserProfile>(field: K, value: UserProfile[K]): void => {
      setProfile((prev) => ({ ...prev, [field]: value }));

      if (field === 'city' && typeof value === 'string') {
        const cityCheck = validateCity(value);
        setFieldErrors((prev) => ({
          ...prev,
          city: cityCheck.isValid ? undefined : cityCheck.error,
        }));
        setValidationError(null);
        return;
      }

      setValidationError(null);
    },
    [],
  );

  const validateProfile = useCallback((): UserProfile | null => {
    const result = validateUserProfile(profile);
    if (!result.isValid || result.error) {
      setValidationError(result.error ?? null);
      setFieldErrors((prev) => ({ ...prev, city: result.error }));
      return null;
    }

    setValidationError(null);
    setFieldErrors({});
    setProfile(result.value);
    return result.value;
  }, [profile]);

  return {
    profile,
    validationError,
    fieldErrors,
    updateField,
    validateProfile,
  };
}
