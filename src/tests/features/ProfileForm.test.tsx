import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_TEXT, DEFAULT_USER_PROFILE, UI_LABELS } from '../../constants/config.ts';
import { ERROR_MESSAGES } from '../../constants/http.ts';
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
  const cityInput = screen.getByLabelText<HTMLInputElement>(UI_LABELS.CITY_LABEL);
  return { onSubmitValid, cityInput };
}

describe('ProfileForm', () => {
  it('shows inline error with aria-invalid and aria-describedby for invalid city', () => {
    const { onSubmitValid, cityInput } = renderHarness();
    fireEvent.change(cityInput, { target: { value: 'A' } });

    expect(cityInput).toHaveAttribute('aria-invalid', 'true');
    expect(cityInput).toHaveAccessibleDescription(
      `${UI_LABELS.CITY_HINT} ${ERROR_MESSAGES.INVALID_CITY}`,
    );

    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toHaveAttribute('id', 'profile-city-error');
    expect(errorAlert).toHaveTextContent(ERROR_MESSAGES.INVALID_CITY);

    const submitButton = screen.getByRole<HTMLButtonElement>('button', {
      name: APP_TEXT.SUBMIT_LABEL,
    });
    expect(submitButton).toBeDisabled();
    expect(onSubmitValid).not.toHaveBeenCalled();
  });

  it('calls submit with validated profile when city and selections are valid', () => {
    const { onSubmitValid, cityInput } = renderHarness();
    fireEvent.change(cityInput, { target: { value: '  Lahore  ' } });
    expect(cityInput).toHaveAttribute('aria-invalid', 'false');

    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));
    expect(onSubmitValid).toHaveBeenCalledTimes(1);
    expect(onSubmitValid).toHaveBeenCalledWith({
      ...DEFAULT_USER_PROFILE,
      city: 'Lahore',
    });
  });
});
