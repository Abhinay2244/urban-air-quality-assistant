import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import {
  AQICategoryId,
  type AQIData,
  type AssistantResponse,
  CommuteMode,
  HomeType,
  RecommendationCategory,
  UrgencyLevel,
} from '../../types/index.ts';
import { applyUrgencyRules } from '../../utils/urgencyRules.ts';

const BASE_RESPONSE: AssistantResponse = {
  summary: 'Moderate smog advisory.',
  priorityGuidance: 'Monitor outdoor air before commuting.',
  recommendations: [
    {
      title: 'Plan Mid-Day Errands',
      category: RecommendationCategory.DAILY_ROUTINE,
      action: 'Shift outdoor errands to midday.',
      impactExplanation: 'Avoids peak morning traffic emissions.',
      estimatedPM25Reduction: 30,
    },
  ],
  isFallback: false,
};

const SEVERE_AQI: AQIData = {
  city: 'Lahore',
  country: 'Pakistan',
  aqi: 265,
  pm25: 195,
  pm10: 290,
  no2: 70,
  o3: 30,
  category: AQICategoryId.VERY_UNHEALTHY,
  updatedAt: '2026-11-18T08:00:00Z',
};

const GOOD_AQI: AQIData = {
  city: 'Zurich',
  country: 'Switzerland',
  aqi: 35,
  pm25: 8,
  pm10: 15,
  no2: 12,
  o3: 24,
  category: AQICategoryId.GOOD,
  updatedAt: '2026-11-18T08:00:00Z',
};

describe('applyUrgencyRules', () => {
  it('places stay-indoors and mask alert first for severe AQI with respiratory condition', () => {
    const result = applyUrgencyRules(
      BASE_RESPONSE,
      {
        ...DEFAULT_USER_PROFILE,
        hasRespiratoryCondition: true,
        commuteMode: CommuteMode.WALK_OR_BIKE,
      },
      SEVERE_AQI,
    );

    expect(result.recommendations[0].category).toBe(RecommendationCategory.HEALTH_ALERT);
    expect(result.recommendations[0].urgency).toBe(UrgencyLevel.CRITICAL);
    expect(result.recommendations[0].action.toLowerCase()).toContain('indoors');
    expect(result.recommendations[0].action.toLowerCase()).toContain('n95');
    expect(result.priorityGuidance.toLowerCase()).toContain('stay indoors');
  });

  it('adds commute-aware adjustment when walking or cycling under unhealthy AQI', () => {
    const result = applyUrgencyRules(
      BASE_RESPONSE,
      {
        ...DEFAULT_USER_PROFILE,
        commuteMode: CommuteMode.WALK_OR_BIKE,
      },
      SEVERE_AQI,
    );

    const hasActiveCommuteGuidance = result.recommendations.some((rec) =>
      rec.title.includes('Active Outdoor Commuting'),
    );
    expect(hasActiveCommuteGuidance).toBe(true);
  });

  it('adds no health alert for Good AQI when household has no vulnerable members', () => {
    const result = applyUrgencyRules(
      BASE_RESPONSE,
      {
        ...DEFAULT_USER_PROFILE,
        hasChildren: false,
        hasElderly: false,
        hasRespiratoryCondition: false,
        commuteMode: CommuteMode.PUBLIC_TRANSIT,
        homeType: HomeType.DETACHED_HOUSE,
      },
      GOOD_AQI,
    );

    const healthAlerts = result.recommendations.filter(
      (rec) => rec.category === RecommendationCategory.HEALTH_ALERT,
    );
    expect(healthAlerts).toHaveLength(0);
    expect(result.priorityGuidance).toBe(BASE_RESPONSE.priorityGuidance);
  });
});
