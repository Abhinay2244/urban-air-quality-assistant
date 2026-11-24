import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../App.tsx';
import { UI_LABELS } from '../../constants/config.ts';
import { API_ENDPOINTS } from '../../constants/http.ts';
import { GEOLOCATION_CONFIG } from '../../constants/limits.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import { LocationCard } from '../../features/profile/LocationCard.tsx';
import { RecommendationCategory } from '../../types/index.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Use my location geolocation errors, options, and /api/aqi coordinate flow', () => {
  it('shows distinct friendly messages per GeolocationPositionError code and passes constant options', () => {
    const getCurrentPosition = vi
      .fn()
      .mockImplementationOnce((_ok: PositionCallback, err: PositionErrorCallback) =>
        err({
          code: GEOLOCATION_CONFIG.PERMISSION_DENIED_CODE,
          message: 'RAW_USER_DENIED_INTERNAL',
        } as GeolocationPositionError),
      )
      .mockImplementationOnce((_ok: PositionCallback, err: PositionErrorCallback) =>
        err({
          code: GEOLOCATION_CONFIG.POSITION_UNAVAILABLE_CODE,
          message: 'RAW_POSITION_FAIL',
        } as GeolocationPositionError),
      )
      .mockImplementationOnce((_ok: PositionCallback, err: PositionErrorCallback) =>
        err({
          code: GEOLOCATION_CONFIG.TIMEOUT_CODE,
          message: 'RAW_TIMEOUT_FAIL',
        } as GeolocationPositionError),
      );
    vi.stubGlobal('navigator', { geolocation: { getCurrentPosition } });

    render(<LocationCard city="Delhi" onCityChange={vi.fn()} onUseCurrentLocation={vi.fn()} />);
    const button = screen.getByRole('button', { name: UI_LABELS.USE_MY_LOCATION_LABEL });

    fireEvent.click(button);
    expect(screen.getByRole('status')).toHaveTextContent(UI_COPY.GEOLOCATION_DENIED);
    expect(screen.getByRole('status')).not.toHaveTextContent('RAW_USER_DENIED_INTERNAL');

    fireEvent.click(button);
    expect(screen.getByRole('status')).toHaveTextContent(UI_COPY.GEOLOCATION_POSITION_UNAVAILABLE);
    expect(screen.getByRole('status')).not.toHaveTextContent('RAW_POSITION_FAIL');

    fireEvent.click(button);
    expect(screen.getByRole('status')).toHaveTextContent(UI_COPY.GEOLOCATION_TIMEOUT);
    expect(screen.getByRole('status')).not.toHaveTextContent('RAW_TIMEOUT_FAIL');

    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
      enableHighAccuracy: GEOLOCATION_CONFIG.ENABLE_HIGH_ACCURACY,
      timeout: GEOLOCATION_CONFIG.TIMEOUT_MS,
      maximumAge: GEOLOCATION_CONFIG.MAXIMUM_AGE_MS,
    });

    vi.stubGlobal('navigator', {});
    fireEvent.click(button);
    expect(screen.getByRole('status')).toHaveTextContent(UI_COPY.GEOLOCATION_UNAVAILABLE);
  });

  it('requests /api/aqi with lat and lon coordinates when browser geolocation succeeds', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback): void => {
          ok({ coords: { latitude: 28.6139, longitude: 77.209 } } as GeolocationPosition);
        },
      },
    });

    const aqiPayload = {
      city: 'New Delhi',
      country: 'India',
      stationName: 'Connaught Place, Delhi',
      provider: 'waqi',
      aqi: 192,
      pm25: 120,
      no2: 38,
      o3: 24,
      updatedAt: '2026-11-23T08:00:00Z',
    };
    const aiPayload = {
      rawText: JSON.stringify({
        summary: 'Use indoor HEPA filtration.',
        priorityGuidance: 'Wear a fitted N95 outside.',
        recommendations: [
          {
            title: 'Run HEPA Purifier',
            category: RecommendationCategory.INDOOR_AIR,
            action: 'Operate purifier in living spaces.',
            impactExplanation: 'Reduces indoor PM2.5.',
            estimatedPM25Reduction: 40,
          },
        ],
      }),
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(aqiPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(aiPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: UI_LABELS.USE_MY_LOCATION_LABEL }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_ENDPOINTS.AQI_LIVE}?lat=28.6139&lon=77.209`,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
      expect(screen.getByText('New Delhi, India')).toBeInTheDocument();
      expect(screen.getByText('Run HEPA Purifier')).toBeInTheDocument();
    });
  });
});
