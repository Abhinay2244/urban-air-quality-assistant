import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  APP_TEXT,
  DEFAULT_USER_PROFILE,
  ERROR_MESSAGES,
  UI_LABELS,
} from '../../constants/config.ts';
import { ProfileForm } from '../../features/profile/ProfileForm.tsx';
import { useProfile } from '../../hooks/useProfile.ts';
import type { UserProfile } from '../../types/index.ts';

interface HarnessProps {
  onSubmitValid: (profile: UserProfile) => void;
}

function ProfileFormHarness({ onSubmitValid }: HarnessProps): ReactElement {
  const { profile, fieldErrors, updateField, validateProfile } = useProfile();

  const handleSubmit = (): void => {
    const valid = validateProfile();
    if (valid) {
      onSubmitValid(valid);
    }
  };

  return (
    <ProfileForm
      profile={profile}
      fieldErrors={fieldErrors}
      isLoading={false}
      cooldownSeconds={0}
      onFieldChange={updateField}
      onSubmit={handleSubmit}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderHarness(): {
  onSubmitValid: ReturnType<typeof vi.fn>;
  cityInput: HTMLInputElement;
} {
  const onSubmitValid = vi.fn();
  render(<ProfileFormHarness onSubmitValid={onSubmitValid} />);
  const cityInput = screen.getByLabelText(UI_LABELS.CITY_LABEL) as HTMLInputElement;
  return { onSubmitValid, cityInput };
}

describe('ProfileForm', () => {
  it('shows inline error with aria-invalid and aria-describedby for invalid city', () => {
    const { onSubmitValid, cityInput } = renderHarness();
    fireEvent.change(cityInput, { target: { value: 'A' } });

    expect(cityInput.getAttribute('aria-invalid')).toBe('true');
    const describedBy = cityInput.getAttribute('aria-describedby') ?? '';
    expect(describedBy).toContain('profile-city-error');
    expect(describedBy).toContain('profile-city-hint');

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert.id).toBe('profile-city-error');
    expect(errorAlert.textContent).toBe(ERROR_MESSAGES.INVALID_CITY);

    const submitButton = screen.getByRole('button', {
      name: APP_TEXT.SUBMIT_LABEL,
    }) as HTMLButtonElement;
    expect(submitButton.disabled).toBe(true);
    expect(onSubmitValid).not.toHaveBeenCalled();
  });

  it('calls submit with validated profile when city and selections are valid', () => {
    const { onSubmitValid, cityInput } = renderHarness();
    fireEvent.change(cityInput, { target: { value: '  Lahore  ' } });
    expect(cityInput.getAttribute('aria-invalid')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));
    expect(onSubmitValid).toHaveBeenCalledTimes(1);
    expect(onSubmitValid).toHaveBeenCalledWith({
      ...DEFAULT_USER_PROFILE,
      city: 'Lahore',
    });
  });
});
