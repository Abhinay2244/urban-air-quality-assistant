import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../App.tsx';
import { APP_TEXT } from '../../constants/config.ts';
import { API_ENDPOINTS } from '../../constants/limits.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import { RecommendationCategory } from '../../types/index.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('App integration flow', () => {
  it('shows empty state first, then renders live results inside aria-live region after submit', async () => {
    const mockAssistantJson = JSON.stringify({
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
      return new Response(JSON.stringify({ rawText: mockAssistantJson }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const { container } = render(<App />);

    expect(screen.getByText(UI_COPY.EMPTY_TITLE)).toBeTruthy();
    expect(screen.getByText(APP_TEXT.EMPTY_PLAN_MESSAGE)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.SUBMIT_LABEL }));

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();

    await waitFor(() => {
      expect(liveRegion?.textContent).toContain('New Delhi, India');
      expect(liveRegion?.textContent).toContain('215');
      expect(liveRegion?.textContent).toContain(UI_COPY.EXPOSURE_LEAD);
      expect(liveRegion?.textContent).toContain('Seal Balcony Windows');
    });
  });
});
