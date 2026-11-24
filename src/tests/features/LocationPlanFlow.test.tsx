import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../App.tsx';
import { APP_TEXT, UI_LABELS } from '../../constants/config.ts';
import { API_ENDPOINTS, ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../constants/http.ts';
import { RecommendationCategory } from '../../types/index.ts';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderLocationFlow(fetchMock: ReturnType<typeof vi.fn>, clearCityInput = false): void {
  vi.stubGlobal('navigator', {
    geolocation: {
      getCurrentPosition: (ok: PositionCallback): void => {
        ok({ coords: { latitude: 28.5672, longitude: 77.21 } } as GeolocationPosition);
      },
    },
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<App />);
  if (clearCityInput) {
    fireEvent.change(screen.getByLabelText(UI_LABELS.CITY_LABEL), { target: { value: '' } });
  }
  fireEvent.click(screen.getByRole('button', { name: UI_LABELS.USE_MY_LOCATION_LABEL }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Use my location coordinate fallback and specific Gemini error propagation', () => {
  it('succeeds with empty form city and resolves empty provider city to Current location', async () => {
    const aqiPayload = {
      city: '',
      country: 'India',
      stationName: 'R K Puram (Sector 2), Station 14',
      provider: 'waqi',
      aqi: 185,
      pm25: 112,
      no2: 41,
      o3: 19,
    };
    const aiPayload = {
      rawText: JSON.stringify({
        summary: 'Limit outdoor exertion today.',
        priorityGuidance: 'Keep HEPA filtration on.',
        recommendations: [
          {
            title: 'Seal Drafty Windows',
            category: RecommendationCategory.INDOOR_AIR,
            action: 'Close window gaps before evening.',
            impactExplanation: 'Reduces PM2.5 infiltration.',
            estimatedPM25Reduction: 35,
          },
        ],
      }),
    };
    const fetchMock = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse(aqiPayload, HTTP_STATUS.OK))
      .mockResolvedValueOnce(jsonResponse(aiPayload, HTTP_STATUS.OK));

    renderLocationFlow(fetchMock, true);

    await waitFor(() => {
      expect(screen.getByText('Seal Drafty Windows')).toBeInTheDocument();
    });

    const geminiCall = fetchMock.mock.calls.find(
      ([url]) => url === API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS,
    );
    expect(geminiCall).toBeDefined();
    const sentBody: unknown = JSON.parse(String(geminiCall?.[1]?.body ?? '{}'));
    expect(sentBody).toMatchObject({
      profile: { city: APP_TEXT.DEFAULT_LOCATION_CITY },
      aqiData: {
        city: APP_TEXT.DEFAULT_LOCATION_CITY,
        stationName: 'R K Puram (Sector 2), Station 14',
      },
    });
  });

  it.each([
    [HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_MESSAGES.AI_QUOTA_EXCEEDED],
    [HTTP_STATUS.GATEWAY_TIMEOUT, ERROR_MESSAGES.UPSTREAM_TIMEOUT],
    [HTTP_STATUS.BAD_REQUEST, ERROR_MESSAGES.INVALID_AI_REQUEST],
  ])(
    'displays specific safe server error (%i) instead of generic AI failure',
    async (status, expectedMessage) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(
            { city: 'Current location', country: 'India', aqi: 150, pm25: 75 },
            HTTP_STATUS.OK,
          ),
        )
        .mockResolvedValueOnce(
          jsonResponse({ code: ERROR_CODES.AI_SERVICE_ERROR, message: expectedMessage }, status),
        );

      renderLocationFlow(fetchMock);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(expectedMessage);
      });
      expect(screen.getByRole('alert')).not.toHaveTextContent(ERROR_MESSAGES.AI_REQUEST_FAILED);
    },
  );
});
