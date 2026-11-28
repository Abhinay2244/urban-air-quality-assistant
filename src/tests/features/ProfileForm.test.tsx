import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_TEXT, DEFAULT_USER_PROFILE, UI_LABELS } from '@shared/constants/config.ts';
import { ERROR_MESSAGES } from '@shared/constants/http.ts';
import { ProfileForm } from '../../features/profile/ProfileForm.tsx';
import { useProfile } from '../../hooks/useProfile.ts';
import {
  type CitySearchResult,
  CommuteMode,
  FamilyType,
  HomeType,
  type UserProfile,
} from '@shared/types/index.ts';

interface HarnessProps {
  onSubmitValid: (profile: UserProfile) => void;
  onSelectCityResult?: (result: CitySearchResult) => void;
}

function ProfileFormHarness({
  onSubmitValid,
  onSelectCityResult,
}: Readonly<HarnessProps>): ReactElement {
  const { profile, fieldErrors, updateField, validateProfile } = useProfile();
  const handleSubmit = (): void => {
    const valid = validateProfile();
    if (valid) onSubmitValid(valid);
  };
  return (
    <ProfileForm
      profile={profile}
      fieldErrors={fieldErrors}
      isLoading={false}
      cooldownSeconds={0}
      onFieldChange={updateField}
      {...(onSelectCityResult !== undefined ? { onSelectCityResult } : {})}
      onSubmit={handleSubmit}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ProfileForm and ARIA city combobox', () => {
  it('shows inline error with aria-invalid and aria-describedby for invalid city', () => {
    const onSubmitValid = vi.fn();
    render(<ProfileFormHarness onSubmitValid={onSubmitValid} />);
    const cityInput = screen.getByRole<HTMLInputElement>('combobox', {
      name: UI_LABELS.CITY_LABEL,
    });
    fireEvent.change(cityInput, { target: { value: 'A' } });

    expect(cityInput).toHaveAttribute('aria-invalid', 'true');
    expect(cityInput).toHaveAccessibleDescription(
      `${UI_LABELS.CITY_HINT} ${ERROR_MESSAGES.INVALID_CITY}`,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(ERROR_MESSAGES.INVALID_CITY);
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: APP_TEXT.SUBMIT_LABEL }),
    ).toBeDisabled();
    expect(onSubmitValid).not.toHaveBeenCalled();
  });

  it('supports ARIA combobox keyboard navigation (ArrowDown/ArrowUp/Enter/Escape) and suggestion count announcement', async () => {
    const mockCities = [
      { name: 'Noida', admin1: 'UP', country: 'India', latitude: 28.53, longitude: 77.39 },
      { name: 'New Delhi', admin1: 'Delhi', country: 'India', latitude: 28.61, longitude: 77.2 },
    ];
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ cities: mockCities }), { status: 200 }),
        ),
    );
    const onSelectCityResult = vi.fn();
    const onSubmitValid = vi.fn();
    const { container } = render(
      <ProfileFormHarness onSubmitValid={onSubmitValid} onSelectCityResult={onSelectCityResult} />,
    );

    const combobox = screen.getByRole<HTMLInputElement>('combobox', { name: UI_LABELS.CITY_LABEL });
    expect(combobox).toHaveAttribute('aria-autocomplete', 'list');
    expect(combobox).toHaveAttribute('aria-expanded', 'false');

    fireEvent.change(combobox, { target: { value: 'No' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
    expect(combobox).toHaveAttribute('aria-expanded', 'true');
    expect(combobox).toHaveAttribute('aria-controls', 'profile-city-listbox');
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(
      `2 ${APP_TEXT.CITY_SUGGESTIONS_PLURAL_SUFFIX}`,
    );

    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]?.id).toBeTruthy();
    expect(combobox).toHaveAttribute('aria-activedescendant', options[0]?.id ?? '');

    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(combobox, { key: 'ArrowUp' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(combobox, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(combobox).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(combobox, { key: 'Enter' });

    expect(onSelectCityResult).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Noida', latitude: 28.53 }),
    );
    expect(onSubmitValid).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Student' }));
    fireEvent.click(screen.getByRole('button', { name: UI_LABELS.HAS_CHILDREN_LABEL }));
    fireEvent.click(screen.getByRole('button', { name: 'Private car' }));
    fireEvent.click(screen.getByRole('button', { name: 'Detached house' }));
    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));

    expect(onSubmitValid).toHaveBeenCalledWith({
      ...DEFAULT_USER_PROFILE,
      city: 'Noida',
      familyType: FamilyType.STUDENT,
      hasChildren: false,
      commuteMode: CommuteMode.CAR,
      homeType: HomeType.DETACHED_HOUSE,
    });
  });
});
