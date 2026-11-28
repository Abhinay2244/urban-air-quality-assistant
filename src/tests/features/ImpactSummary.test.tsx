import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { APP_TEXT, DEFAULT_USER_PROFILE } from '@shared/constants/config.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import { WhyThesePanel } from '../../features/assistant/WhyThesePanel.tsx';
import { ImpactSummary } from '../../features/impact/ImpactSummary.tsx';
import { AqiCategoryId, type AqiData, FamilyType } from '@shared/types/index.ts';

afterEach(() => {
  cleanup();
});

const SAMPLE_AQI: AqiData = {
  city: 'Delhi',
  country: 'India',
  stationName: 'Anand Vihar, Delhi',
  provider: 'waqi',
  aqi: 620,
  pm25: 380,
  pm10: 490,
  no2: 65,
  o3: 25,
  category: AqiCategoryId.HAZARDOUS,
  updatedAt: '2026-11-21T08:00:00Z',
  source: 'live',
};

describe('ImpactSummary and WhyThesePanel', () => {
  it('displays real AQI above 500 with above-scale note, WAQI source, station, US scale label, and WHO guidelines', () => {
    render(
      <ImpactSummary
        aqiData={SAMPLE_AQI}
        response={null}
        isAqiUnavailable={false}
        isLoading={false}
        onEnableManualAqi={vi.fn()}
        onSubmitManualAqi={vi.fn()}
      />,
    );

    expect(screen.getByText('620')).toBeInTheDocument();
    expect(screen.getAllByText(UI_COPY.ABOVE_SCALE_NOTE).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Hazardous')).toBeInTheDocument();
    expect(screen.getByText(APP_TEXT.LIVE_WAQI_SOURCE_LABEL)).toBeInTheDocument();
    expect(screen.getByText(/Station: Anand Vihar, Delhi/)).toBeInTheDocument();
    expect(screen.getByText(APP_TEXT.AQI_SCALE_LABEL)).toBeInTheDocument();
    expect(screen.getByText(/PM2\.5: 380\.0 ug\/m3/)).toBeInTheDocument();
    expect(screen.getByText(/PM10: 490\.0 ug\/m3/)).toBeInTheDocument();
    expect(screen.queryByText(UI_COPY.TODAYS_PLAN_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(UI_COPY.BEST_OUTDOOR_TITLE)).not.toBeInTheDocument();
  });

  it("renders Today's plan slots, Best time for outdoor activity, and location warnings when present", () => {
    render(
      <ImpactSummary
        aqiData={{
          ...SAMPLE_AQI,
          aqi: 185,
          category: AqiCategoryId.UNHEALTHY,
          provider: 'open-meteo',
          locationWarning: 'Warning: Nearest station is ~65 km away.',
          hourlyPm25: [
            { time: '2026-11-21T09:00', pm25: 165 },
            { time: '2026-11-21T13:00', pm25: 50 },
            { time: '2026-11-21T14:00', pm25: 40 },
            { time: '2026-11-21T15:00', pm25: 120 },
            { time: '2026-11-21T19:00', pm25: 130 },
          ],
        }}
        response={null}
        isAqiUnavailable={false}
        isLoading={false}
        onEnableManualAqi={vi.fn()}
        onSubmitManualAqi={vi.fn()}
      />,
    );

    expect(screen.getByText(APP_TEXT.LIVE_OPEN_METEO_SOURCE_LABEL)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Warning: Nearest station is ~65 km away.',
    );
    expect(screen.getByText(UI_COPY.BEST_OUTDOOR_TITLE)).toBeInTheDocument();
    expect(screen.getByText('1:00 PM – 3:00 PM')).toBeInTheDocument();
    expect(screen.getByText(UI_COPY.TODAYS_PLAN_TITLE)).toBeInTheDocument();
    expect(screen.getByText('Morning')).toBeInTheDocument();
    expect(screen.getByText('Afternoon')).toBeInTheDocument();
    expect(screen.getByText('Evening')).toBeInTheDocument();
  });

  it('shows Manual entry label and Student context chips inside WhyThesePanel', () => {
    render(
      <ImpactSummary
        aqiData={{
          ...SAMPLE_AQI,
          aqi: 220,
          category: AqiCategoryId.VERY_UNHEALTHY,
          source: 'manual',
        }}
        response={null}
        isAqiUnavailable={false}
        isLoading={false}
        onEnableManualAqi={vi.fn()}
        onSubmitManualAqi={vi.fn()}
      />,
    );
    expect(screen.getByText(APP_TEXT.MANUAL_AQI_SOURCE_LABEL)).toBeInTheDocument();

    render(
      <WhyThesePanel
        profile={{ ...DEFAULT_USER_PROFILE, familyType: FamilyType.STUDENT }}
        aqiData={SAMPLE_AQI}
      />,
    );
    expect(screen.getByText('Student')).toBeInTheDocument();
  });
});
