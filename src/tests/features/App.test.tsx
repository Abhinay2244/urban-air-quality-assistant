import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_TEXT, UI_LABELS } from '@shared/constants/config.ts';
import { API_ENDPOINTS, ERROR_CODES, ERROR_MESSAGES } from '@shared/constants/http.ts';
import { RecommendationCategory } from '@shared/types/index.ts';
import App from '../../App.tsx';
import { UI_COPY } from '../../constants/uiTheme.ts';

const MOCK_RAW = JSON.stringify({
  summary: 'High particulate levels require sealing indoor spaces during morning peaks.',
  priorityGuidance: 'Run HEPA filtration and delay outdoor school commutes.',
  recommendations: [
    {
      title: 'Seal Balcony Windows',
      category: RecommendationCategory.INDOOR_AIR,
      action: 'Close window vents and run filtration continuously.',
      impactExplanation: 'Cuts indoor PM2.5 infiltration.',
      estimatedPM25Reduction: 40,
    },
  ],
});

const LIVE_AQI = {
  city: 'Delhi',
  country: 'India',
  stationName: 'Mandir Marg, Delhi',
  provider: 'waqi',
  aqi: 215,
  pm25: 140,
  pm10: 210,
  no2: 45,
  o3: 22,
  updatedAt: '2026-11-18T08:00:00Z',
  hourlyPm25: [
    { time: '2026-11-18T08:00', pm25: 160 },
    { time: '2026-11-18T13:00', pm25: 85 },
    { time: '2026-11-18T14:00', pm25: 75 },
  ],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const readFetchUrl = (input: string | URL | Request): string => {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
};

describe('App integration flow', () => {
  it('renders live results with aria-busy, moves focus to results heading without duplicate live region, and enforces cooldown', async () => {
    const fetchMock = vi.fn((input: string | URL | Request): Promise<Response> => {
      const payload = readFetchUrl(input).startsWith(API_ENDPOINTS.AQI_LIVE)
        ? LIVE_AQI
        : { rawText: MOCK_RAW };
      return Promise.resolve(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<App />);
    expect(screen.getByText(UI_COPY.EMPTY_TITLE)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));

    const resultsRegion = container.querySelector('[aria-busy]');
    expect(resultsRegion).toHaveAttribute('aria-busy', 'true');
    expect(resultsRegion).not.toHaveAttribute('aria-live');

    await waitFor(() => {
      expect(resultsRegion).toHaveAttribute('aria-busy', 'false');
      expect(resultsRegion).toHaveTextContent('Delhi, India');
      expect(resultsRegion).toHaveTextContent('215');
      expect(resultsRegion).toHaveTextContent('Very Unhealthy');
      expect(resultsRegion).toHaveTextContent(APP_TEXT.LIVE_WAQI_SOURCE_LABEL);
      expect(resultsRegion).toHaveTextContent('PM10: 210.0 ug/m3');
      expect(resultsRegion).toHaveTextContent(UI_COPY.TODAYS_PLAN_TITLE);
      expect(resultsRegion).toHaveTextContent(UI_COPY.BEST_OUTDOOR_TITLE);
      expect(resultsRegion).toHaveTextContent('Seal Balcony Windows');
    });

    const resultsHeading = screen.getByRole('heading', { name: UI_LABELS.ASSISTANT_SECTION_TITLE });
    expect(resultsHeading).toHaveAttribute('tabindex', '-1');
    await waitFor(() => {
      expect(resultsHeading).toHaveFocus();
    });

    const cooldownButton = screen.getByRole<HTMLButtonElement>('button', {
      name: new RegExp(`^${UI_COPY.COOLDOWN_BUTTON_PREFIX}`),
    });
    expect(cooldownButton).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(cooldownButton);
    expect(screen.getByRole('status')).toHaveTextContent(/Please wait \d+ seconds?/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('focuses ErrorBanner on failure, supports retry/dismiss, and labels manual entry results', async () => {
    const errRes = (): Response =>
      new Response(
        JSON.stringify({
          code: ERROR_CODES.AQI_FETCH_ERROR,
          message: ERROR_MESSAGES.AQI_FETCH_FAILED,
        }),
        { status: 502 },
      );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errRes())
      .mockResolvedValueOnce(errRes())
      .mockResolvedValueOnce(new Response(JSON.stringify({ rawText: MOCK_RAW }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));

    await waitFor(() => {
      const alertBanner = screen.getByRole('alert');
      expect(alertBanner).toHaveTextContent(ERROR_MESSAGES.AQI_FETCH_FAILED);
      expect(alertBanner).toHaveFocus();
    });
    expect(screen.getByLabelText(UI_LABELS.MANUAL_AQI_INPUT_LABEL)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: UI_LABELS.RETRY_LABEL }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole('button', { name: UI_LABELS.DISMISS_ERROR_LABEL }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText<HTMLInputElement>(UI_LABELS.MANUAL_AQI_INPUT_LABEL), {
      target: { value: '240' },
    });
    fireEvent.click(screen.getByRole('button', { name: UI_LABELS.MANUAL_AQI_SUBMIT_LABEL }));

    const resultsRegion = container.querySelector('[aria-busy]');
    await waitFor(() => {
      expect(resultsRegion).toHaveTextContent('240');
      expect(resultsRegion).toHaveTextContent(APP_TEXT.MANUAL_AQI_SOURCE_LABEL);
      expect(resultsRegion).toHaveTextContent('Seal Balcony Windows');
    });
  });
});
