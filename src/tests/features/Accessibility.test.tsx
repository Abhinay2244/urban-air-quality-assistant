import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../App.tsx';
import { AqiGauge } from '../../components/AqiGauge.tsx';
import { APP_TEXT, UI_LABELS } from '@shared/constants/config.ts';
import { API_ENDPOINTS, ERROR_CODES, ERROR_MESSAGES } from '@shared/constants/http.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import { RecommendationCategory } from '@shared/types/index.ts';
import { getAqiCategoryByValue } from '../../utils/aqiCalculations.ts';

const MOCK_PLAN_WITH_SPOOFED_AQI = JSON.stringify({
  summary: 'Simulated text claiming AQI is 15 Good even when station reading is 215.',
  priorityGuidance: 'Stay indoors and keep HEPA filtration active.',
  recommendations: [
    {
      title: 'Run HEPA Purifier',
      category: RecommendationCategory.INDOOR_AIR,
      action: 'Close exterior vents and run room air filtration continuously.',
      impactExplanation: 'Reduces indoor fine particulate buildup.',
      estimatedPM25Reduction: 35,
    },
  ],
});

const SAMPLE_LIVE_AQI = {
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
  document.documentElement.classList.remove('dark');
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function assertZeroAxeViolations(container: HTMLElement): Promise<void> {
  document.documentElement.classList.remove('dark');
  expect((await axe(container)).violations).toEqual([]);
  document.documentElement.classList.add('dark');
  expect((await axe(container)).violations).toEqual([]);
}

function readFetchUrl(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

describe('Accessibility (WCAG 2.2 AA / vitest-axe) and AQI integrity', () => {
  it('provides a skip link targeting main-content and passes axe in empty & loading states', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    const { container } = render(<App />);

    const skipLink = screen.getByRole('link', { name: APP_TEXT.SKIP_TO_MAIN_CONTENT });
    expect(skipLink).toHaveAttribute('href', '#main-content');
    const mainEl = container.querySelector('main#main-content');
    expect(mainEl).toHaveAttribute('tabindex', '-1');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    await assertZeroAxeViolations(container);

    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));
    await waitFor(() => {
      expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    });
    await assertZeroAxeViolations(container);
  });

  it('passes axe in error and manual-entry states', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: ERROR_CODES.AQI_FETCH_ERROR,
            message: ERROR_MESSAGES.AQI_FETCH_FAILED,
          }),
          { status: 502 },
        ),
      ),
    );
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByLabelText(UI_LABELS.MANUAL_AQI_INPUT_LABEL)).toBeInTheDocument();
    });
    await assertZeroAxeViolations(container);
  });

  it('passes axe in results state and preserves provider AQI over model-generated text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request): Promise<Response> => {
        const url = readFetchUrl(input);
        if (url.startsWith(API_ENDPOINTS.AQI_LIVE)) {
          return Promise.resolve(new Response(JSON.stringify(SAMPLE_LIVE_AQI), { status: 200 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify({ rawText: MOCK_PLAN_WITH_SPOOFED_AQI }), {
            status: 200,
          }),
        );
      }),
    );

    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));

    await waitFor(() => {
      expect(screen.getByText(UI_COPY.TODAYS_PLAN_TITLE)).toBeInTheDocument();
    });

    const gauge = screen.getByRole('img', { name: /AQI \(US scale\) 215: Very Unhealthy/ });
    expect(gauge).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /\b15\b/ })).not.toBeInTheDocument();
    await assertZeroAxeViolations(container);
  });

  it('states value, category, and US scale on AqiGauge for standard and above-scale values', () => {
    render(<AqiGauge aqi={620} category={getAqiCategoryByValue(620)} />);
    expect(
      screen.getByRole('img', { name: 'AQI (US scale) 620 (above scale): Hazardous' }),
    ).toBeInTheDocument();
  });
});
