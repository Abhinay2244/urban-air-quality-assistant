import {
  AqiCategoryId,
  type AqiData,
  type AssistantResponse,
  RecommendationCategory,
} from '../../types/index.ts';

/** Sample live AqiData fixture shared by assistant hook tests. */
export const MOCK_AQI_FIXTURE: AqiData = {
  city: 'New Delhi',
  country: 'India',
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
