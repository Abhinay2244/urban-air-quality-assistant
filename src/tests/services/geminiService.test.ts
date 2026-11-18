import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import { SAFE_FALLBACK_ASSISTANT_RESPONSE } from '../../constants/prompts.ts';
import { getAirQualityRecommendations } from '../../services/geminiService.ts';
import {
  AQICategoryId,
  type AQIData,
  ErrorCode,
  RecommendationCategory,
} from '../../types/index.ts';

const SAMPLE_AQI_DATA: AQIData = {
  city: 'New Delhi',
  country: 'India',
  aqi: 260,
  pm25: 185,
  pm10: 270,
  no2: 58,
  o3: 24,
  category: AQICategoryId.VERY_UNHEALTHY,
  updatedAt: '2026-11-18T08:00:00Z',
};

describe('geminiService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns validated structured recommendations from the API endpoint', async () => {
    const modelJson = JSON.stringify({
      summary: 'Severe winter smog requires indoor filtration.',
      priorityGuidance: 'Keep children indoors and run HEPA purification.',
      recommendations: [
        {
          title: 'Run Clean-Air Room',
          category: RecommendationCategory.INDOOR_AIR,
          action: 'Run HEPA purifier on medium-high in the bedroom.',
          impactExplanation: 'Cuts indoor fine particle exposure sharply.',
          estimatedPM25Reduction: 55,
        },
      ],
    });

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ rawText: modelJson }), { status: 200 }),
        ),
    );

    const result = await getAirQualityRecommendations(DEFAULT_USER_PROFILE, SAMPLE_AQI_DATA);
    expect(result.isFallback).toBe(false);
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].estimatedPM25Reduction).toBe(55);
  });

  it('falls back safely when the server returns unparseable rawText', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ rawText: 'not-valid-json' }), { status: 200 }),
        ),
    );

    const result = await getAirQualityRecommendations(DEFAULT_USER_PROFILE, SAMPLE_AQI_DATA);
    expect(result).toEqual(SAFE_FALLBACK_ASSISTANT_RESPONSE);
  });

  it('propagates typed API errors and emits NETWORK_ERROR on fetch TypeError', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ code: ErrorCode.AI_SERVICE_ERROR, message: 'Missing API key' }),
            { status: 500 },
          ),
        )
        .mockRejectedValueOnce(new TypeError('Offline')),
    );

    await expect(
      getAirQualityRecommendations(DEFAULT_USER_PROFILE, SAMPLE_AQI_DATA),
    ).rejects.toMatchObject({
      code: ErrorCode.AI_SERVICE_ERROR,
      message: 'Missing API key',
    });

    await expect(
      getAirQualityRecommendations(DEFAULT_USER_PROFILE, SAMPLE_AQI_DATA),
    ).rejects.toMatchObject({
      code: ErrorCode.NETWORK_ERROR,
    });
  });
});
