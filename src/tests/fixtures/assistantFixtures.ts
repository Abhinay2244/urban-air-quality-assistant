import { type MockInstance, vi } from 'vitest';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import * as aqiService from '../../services/aqiService.ts';
import * as geminiService from '../../services/geminiService.ts';
import {
  AqiCategoryId,
  type AqiData,
  type AssistantResponse,
  RecommendationCategory,
  type UserProfile,
} from '../../types/index.ts';

/** Default UserProfile fixture shared by assistant hook tests. */
export const DEFAULT_PROFILE_FIXTURE: UserProfile = DEFAULT_USER_PROFILE;

/** Spies on fetchAqiDataByCity for hook cancellation tests. */
export function spyCityAqiLookup(): MockInstance<typeof aqiService.fetchAqiDataByCity> {
  return vi.spyOn(aqiService, 'fetchAqiDataByCity');
}

/** Spies on getAirQualityRecommendations for hook cancellation tests. */
export function spyRecommendationsCall(): MockInstance<
  typeof geminiService.getAirQualityRecommendations
> {
  return vi.spyOn(geminiService, 'getAirQualityRecommendations');
}

/** Sample live AqiData fixture shared by assistant hook tests. */
export const MOCK_AQI_FIXTURE: AqiData = {
  city: 'Delhi',
  country: 'India',
  stationName: 'Anand Vihar, Delhi',
  provider: 'waqi',
  aqi: 210,
  pm25: 160,
  pm10: 240,
  no2: 55,
  o3: 28,
  category: AqiCategoryId.VERY_UNHEALTHY,
  updatedAt: '2026-11-18T08:00:00Z',
  source: 'live',
};

/** Sample AssistantResponse fixture shared by assistant hook tests. */
export const MOCK_ASSISTANT_RESPONSE_FIXTURE: AssistantResponse = {
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
