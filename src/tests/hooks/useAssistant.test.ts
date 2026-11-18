import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import { useAssistant } from '../../hooks/useAssistant.ts';
import * as aqiService from '../../services/aqiService.ts';
import * as geminiService from '../../services/geminiService.ts';
import {
  AQICategoryId,
  type AQIData,
  type AssistantResponse,
  ErrorCode,
  RecommendationCategory,
} from '../../types/index.ts';
import { createAppError } from '../../utils/errors.ts';

const MOCK_AQI: AQIData = {
  city: 'New Delhi',
  country: 'India',
  aqi: 210,
  pm25: 160,
  pm10: 240,
  no2: 55,
  o3: 28,
  category: AQICategoryId.VERY_UNHEALTHY,
  updatedAt: '2026-11-18T08:00:00Z',
  source: 'live',
};

const MOCK_RESPONSE: AssistantResponse = {
  summary: 'Stay indoors during inversion.',
  priorityGuidance: 'Run purifier.',
  recommendations: [
    {
      title: 'Filter Indoor Air',
      category: RecommendationCategory.INDOOR_AIR,
      action: 'Use HEPA unit in bedroom.',
      impactExplanation: 'Lowers inhaled PM2.5.',
      estimatedPM25Reduction: 50,
    },
  ],
  isFallback: false,
};

async function setupAndGenerate(): Promise<
  ReturnType<typeof renderHook<ReturnType<typeof useAssistant>, unknown>>
> {
  const hook = renderHook(() => useAssistant());
  await act(async () => {
    await hook.result.current.generatePlan(DEFAULT_USER_PROFILE);
  });
  return hook;
}

describe('useAssistant hook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches AQI data, applies urgency rules, and starts submit cooldown', async () => {
    vi.spyOn(aqiService, 'fetchAQIDataByCity').mockResolvedValueOnce(MOCK_AQI);
    vi.spyOn(geminiService, 'getAirQualityRecommendations').mockResolvedValueOnce(MOCK_RESPONSE);

    const { result } = await setupAndGenerate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.aqiData).toEqual(MOCK_AQI);
    expect(result.current.assistantResponse?.recommendations.length).toBeGreaterThan(0);
    expect(result.current.cooldownSeconds).toBeGreaterThan(0);
  });

  it('enables manual AQI fallback when live AQI fetch fails and generates plan manually', async () => {
    vi.spyOn(aqiService, 'fetchAQIDataByCity').mockRejectedValueOnce(
      createAppError(ErrorCode.AQI_FETCH_ERROR, 'API down'),
    );
    vi.spyOn(geminiService, 'getAirQualityRecommendations').mockResolvedValueOnce(MOCK_RESPONSE);

    const { result } = await setupAndGenerate();

    expect(result.current.isAqiUnavailable).toBe(true);
    expect(result.current.error?.code).toBe(ErrorCode.AQI_FETCH_ERROR);

    await act(async () => {
      await result.current.generatePlanWithManualAqi(DEFAULT_USER_PROFILE, 185);
    });

    expect(result.current.isAqiUnavailable).toBe(false);
    expect(result.current.aqiData?.source).toBe('manual');
    expect(result.current.assistantResponse).not.toBeNull();
  });
});
