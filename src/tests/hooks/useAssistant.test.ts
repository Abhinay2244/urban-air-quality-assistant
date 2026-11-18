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

describe('useAssistant hook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches AQI data and generates assistant recommendations', async () => {
    vi.spyOn(aqiService, 'fetchAQIDataByCity').mockResolvedValueOnce(MOCK_AQI);
    vi.spyOn(geminiService, 'getAirQualityRecommendations').mockResolvedValueOnce(MOCK_RESPONSE);

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      await result.current.generatePlan(DEFAULT_USER_PROFILE);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.aqiData).toEqual(MOCK_AQI);
    expect(result.current.assistantResponse).toEqual(MOCK_RESPONSE);
  });

  it('captures typed error when AQI fetch fails', async () => {
    vi.spyOn(aqiService, 'fetchAQIDataByCity').mockRejectedValueOnce(
      createAppError(ErrorCode.CITY_NOT_FOUND, 'City not found'),
    );

    const { result } = renderHook(() => useAssistant());

    await act(async () => {
      await result.current.generatePlan(DEFAULT_USER_PROFILE);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error?.code).toBe(ErrorCode.CITY_NOT_FOUND);
  });
});
