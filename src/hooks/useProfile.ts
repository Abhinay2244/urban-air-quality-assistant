import { useCallback, useState } from 'react';
import { DEFAULT_USER_PROFILE } from '../constants/config.ts';
import type { AppError, UserProfile } from '../types/index.ts';
import { validateUserProfile } from '../utils/validation.ts';

/**
 * Return value of the useProfile custom hook.
 */
export interface UseProfileResult {
  profile: UserProfile;
  validationError: AppError | null;
  updateField: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => void;
  validateProfile: () => UserProfile | null;
  resetProfile: () => void;
}

/**
 * Manages household profile state, field updates, and validation.
 */
export function useProfile(initialProfile: UserProfile = DEFAULT_USER_PROFILE): UseProfileResult {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [validationError, setValidationError] = useState<AppError | null>(null);

  const updateField = useCallback(
    <K extends keyof UserProfile>(field: K, value: UserProfile[K]): void => {
      setProfile((prev) => ({ ...prev, [field]: value }));
      setValidationError(null);
    },
    [],
  );

  const validateProfile = useCallback((): UserProfile | null => {
    const result = validateUserProfile(profile);
    if (!result.isValid || result.error) {
      setValidationError(result.error ?? null);
      return null;
    }

    setValidationError(null);
    setProfile(result.value);
    return result.value;
  }, [profile]);

  const resetProfile = useCallback((): void => {
    setProfile(initialProfile);
    setValidationError(null);
  }, [initialProfile]);

  return {
    profile,
    validationError,
    updateField,
    validateProfile,
    resetProfile,
  };
}
