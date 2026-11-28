import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_TEXT, UI_LABELS } from '@shared/constants/config.ts';
import { API_ENDPOINTS, ERROR_CODES, ERROR_MESSAGES } from '@shared/constants/http.ts';
import { RecommendationCategory } from '@shared/types/index.ts';
import App from '../../App.tsx';

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
  stationName: 'Delhi (28.65, 77.23)',
  provider: 'open-meteo',
  aqi: 251,
  pm25: 99,
  pm10: 101,
  no2: 43.1,
  o3: 146,
  updatedAt: '2026-11-28T15:30',
};

const jsonOk = (body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

const readUrl = (input: string | URL | Request): string => {
  if (typeof input === 'string') {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('App recommendations request-state regression', () => {
  it('(a) AQI ok + recommendations ok shows the plan and no error banner', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) =>
        Promise.resolve(
          readUrl(input).startsWith(API_ENDPOINTS.AQI_LIVE)
            ? jsonOk(LIVE_AQI)
            : jsonOk({ rawText: MOCK_RAW }),
        ),
      ),
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));

    await waitFor(() => {
      expect(screen.getByText('Seal Balcony Windows')).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('(b) failing request followed by successful retry shows the plan and no error banner', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonOk(LIVE_AQI))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: ERROR_CODES.AI_SERVICE_ERROR,
            message: ERROR_MESSAGES.UPSTREAM_TIMEOUT,
          }),
          { status: 504, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(jsonOk(LIVE_AQI))
      .mockResolvedValueOnce(jsonOk({ rawText: MOCK_RAW }));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(ERROR_MESSAGES.UPSTREAM_TIMEOUT);
    });

    fireEvent.click(screen.getByRole('button', { name: UI_LABELS.RETRY_LABEL }));

    await waitFor(() => {
      expect(screen.getByText('Seal Balcony Windows')).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('(c) slow failing request finishing after a newer success does not show an error banner', async () => {
    let rejectSlow!: (err: unknown) => void;
    const slowPromise = new Promise<Response>((_resolve, reject) => {
      rejectSlow = reject;
    });

    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(slowPromise)
      .mockResolvedValueOnce(jsonOk(LIVE_AQI))
      .mockResolvedValueOnce(jsonOk({ rawText: MOCK_RAW }));
    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const form = container.querySelector('form');
    if (!form) {
      throw new Error('Expected profile form');
    }
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Seal Balcony Windows')).toBeInTheDocument();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    rejectSlow(new TypeError('Slow network failure'));
    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByText('Seal Balcony Windows')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
