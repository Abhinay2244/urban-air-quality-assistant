import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../App.tsx';
import { APP_TEXT, ERROR_MESSAGES, UI_LABELS } from '../../constants/config.ts';
import { API_ENDPOINTS, ERROR_CODES } from '../../constants/limits.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import { RecommendationCategory } from '../../types/index.ts';

const MOCK_ASSISTANT_RAW = JSON.stringify({
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('App integration flow', () => {
  it('shows empty state first, then renders live results inside aria-live region after submit', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith(API_ENDPOINTS.AQI_LIVE)) {
        return new Response(
          JSON.stringify({
            city: 'New Delhi',
            country: 'India',
            aqi: 215,
            pm25: 140,
            pm10: 210,
            no2: 45,
            o3: 22,
            updatedAt: '2026-11-18T08:00:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ rawText: MOCK_ASSISTANT_RAW }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<App />);
    expect(screen.getByText(UI_COPY.EMPTY_TITLE)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));

    const liveRegion = container.querySelector('[aria-live="polite"]');
    await waitFor(() => {
      expect(liveRegion?.textContent).toContain('New Delhi, India');
      expect(liveRegion?.textContent).toContain('215');
      expect(liveRegion?.textContent).toContain('Seal Balcony Windows');
    });
  });

  it('shows ManualAqiForm on live AQI failure, supports ErrorBanner retry/dismiss, and renders manual plan', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: ERROR_CODES.AQI_FETCH_ERROR,
            message: ERROR_MESSAGES.AQI_FETCH_FAILED,
          }),
          { status: 502 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: ERROR_CODES.AQI_FETCH_ERROR,
            message: ERROR_MESSAGES.AQI_FETCH_FAILED,
          }),
          { status: 502 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ rawText: MOCK_ASSISTANT_RAW }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(ERROR_MESSAGES.AQI_FETCH_FAILED);
    });
    expect(screen.getByLabelText(UI_LABELS.MANUAL_AQI_INPUT_LABEL)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: UI_LABELS.RETRY_LABEL }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole('button', { name: UI_LABELS.DISMISS_ERROR_LABEL }));
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.change(screen.getByLabelText(UI_LABELS.MANUAL_AQI_INPUT_LABEL), {
      target: { value: '240' },
    });
    fireEvent.click(screen.getByRole('button', { name: UI_LABELS.MANUAL_AQI_SUBMIT_LABEL }));

    const liveRegion = container.querySelector('[aria-live="polite"]');
    await waitFor(() => {
      expect(liveRegion?.textContent).toContain('240');
      expect(liveRegion?.textContent).toContain('Seal Balcony Windows');
    });
  });
});
