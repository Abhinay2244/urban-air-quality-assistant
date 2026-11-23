import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_TEXT, DEFAULT_USER_PROFILE, UI_LABELS } from '../../constants/config.ts';
import { ERROR_MESSAGES } from '../../constants/http.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import { ProfileForm } from '../../features/profile/ProfileForm.tsx';
import { useProfile } from '../../hooks/useProfile.ts';
import type { CitySearchResult, Coordinates, UserProfile } from '../../types/index.ts';

interface HarnessProps {
  onSubmitValid: (profile: UserProfile) => void;
  onSelectCityResult?: (result: CitySearchResult) => void;
  onUseCurrentLocation?: (coords: Coordinates) => void;
}

function ProfileFormHarness({
  onSubmitValid,
  onSelectCityResult,
  onUseCurrentLocation,
}: HarnessProps): ReactElement {
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
      onSelectCityResult={onSelectCityResult}
      onUseCurrentLocation={onUseCurrentLocation}
      onSubmit={handleSubmit}
    />
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ProfileForm and India city search / geolocation', () => {
  it('shows inline error with aria-invalid and aria-describedby for invalid city', () => {
    const onSubmitValid = vi.fn();
    render(<ProfileFormHarness onSubmitValid={onSubmitValid} />);
    const cityInput = screen.getByLabelText<HTMLInputElement>(UI_LABELS.CITY_LABEL);
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

  it('displays India-only city search suggestions and forwards selected coordinates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            cities: [
              {
                name: 'Noida',
                admin1: 'Uttar Pradesh',
                country: 'India',
                latitude: 28.53,
                longitude: 77.39,
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    const onSelectCityResult = vi.fn();
    const onSubmitValid = vi.fn();
    render(
      <ProfileFormHarness onSubmitValid={onSubmitValid} onSelectCityResult={onSelectCityResult} />,
    );

    fireEvent.change(screen.getByLabelText<HTMLInputElement>(UI_LABELS.CITY_LABEL), {
      target: { value: 'Noida' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Noida/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Noida/ }));

    expect(onSelectCityResult).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Noida', latitude: 28.53 }),
    );
    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));
    expect(onSubmitValid).toHaveBeenCalledWith({ ...DEFAULT_USER_PROFILE, city: 'Noida' });
  });

  it('handles Use my location permission grant and denied fallback cleanly', () => {
    const onUseCurrentLocation = vi.fn();
    const getCurrentPosition = vi
      .fn()
      .mockImplementationOnce((_ok: PositionCallback, err: PositionErrorCallback) =>
        err({ code: 1 } as GeolocationPositionError),
      )
      .mockImplementationOnce((ok: PositionCallback) =>
        ok({ coords: { latitude: 28.61, longitude: 77.21 } } as GeolocationPosition),
      );
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });

    render(
      <ProfileFormHarness onSubmitValid={vi.fn()} onUseCurrentLocation={onUseCurrentLocation} />,
    );
    const geoBtn = screen.getByRole('button', { name: UI_LABELS.USE_MY_LOCATION_LABEL });

    fireEvent.click(geoBtn);
    expect(screen.getByRole('status')).toHaveTextContent(UI_COPY.GEOLOCATION_DENIED);

    fireEvent.click(geoBtn);
    expect(onUseCurrentLocation).toHaveBeenCalledWith({ latitude: 28.61, longitude: 77.21 });
  });
});
