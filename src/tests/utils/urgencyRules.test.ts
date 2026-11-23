import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import {
  AqiCategoryId,
  type AqiData,
  type AssistantResponse,
  CommuteMode,
  HomeType,
  RecommendationCategory,
  UrgencyLevel,
} from '../../types/index.ts';
import { getAqiCategoryByValue } from '../../utils/aqiCalculations.ts';
import { applyUrgencyRules } from '../../utils/urgencyRules.ts';

const BASE_RESPONSE: AssistantResponse = {
  summary: 'Smog advisory.',
  priorityGuidance: 'Monitor outdoor air before commuting.',
  recommendations: [
    {
      title: 'General Air Advisory',
      category: RecommendationCategory.HEALTH_ALERT,
      action: 'Avoid prolonged traffic exposure today.',
      impactExplanation: 'Reduces roadside inhalation.',
      estimatedPM25Reduction: 20,
    },
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

function makeAqi(aqi: number): AqiData {
  return {
    city: 'Delhi',
    country: 'India',
    aqi,
    pm25: 90,
    no2: 35,
    o3: 25,
    category: getAqiCategoryByValue(aqi).id,
    updatedAt: '2026-11-18T08:00:00Z',
  };
}

describe('applyUrgencyRules (US EPA safety boundaries)', () => {
  it('enforces exact threshold boundaries 100 vs 101 for vulnerable households', () => {
    const vulnerableProfile = {
      ...DEFAULT_USER_PROFILE,
      hasChildren: false,
      hasElderly: false,
      hasRespiratoryCondition: true,
    };

    const at100 = applyUrgencyRules(BASE_RESPONSE, vulnerableProfile, makeAqi(100));
    expect(at100.priorityGuidance).toBe(BASE_RESPONSE.priorityGuidance);
    expect(at100.recommendations.some((r) => r.action.toLowerCase().includes('n95'))).toBe(false);

    const at101 = applyUrgencyRules(BASE_RESPONSE, vulnerableProfile, makeAqi(101));
    expect(at101.recommendations[0].category).toBe(RecommendationCategory.HEALTH_ALERT);
    expect(at101.recommendations[0].urgency).toBe(UrgencyLevel.CRITICAL);
    expect(at101.recommendations[0].action.toLowerCase()).toContain('n95');
    expect(at101.priorityGuidance.toLowerCase()).toContain('stay indoors');
  });

  it('enforces exact threshold boundaries 150 vs 151 for non-vulnerable households', () => {
    const healthyProfile = {
      ...DEFAULT_USER_PROFILE,
      hasChildren: false,
      hasElderly: false,
      hasRespiratoryCondition: false,
      commuteMode: CommuteMode.PUBLIC_TRANSIT,
      homeType: HomeType.DETACHED_HOUSE,
    };

    const at150 = applyUrgencyRules(BASE_RESPONSE, healthyProfile, makeAqi(150));
    expect(at150.priorityGuidance).toBe(BASE_RESPONSE.priorityGuidance);
    expect(at150.recommendations.some((r) => r.action.toLowerCase().includes('n95'))).toBe(false);

    const at151 = applyUrgencyRules(BASE_RESPONSE, healthyProfile, makeAqi(151));
    expect(at151.recommendations[0].category).toBe(RecommendationCategory.HEALTH_ALERT);
    expect(at151.recommendations[0].urgency).toBe(UrgencyLevel.CRITICAL);
    expect(at151.recommendations[0].action.toLowerCase()).toContain('n95');
    expect(at151.priorityGuidance).toContain('151');
  });

  it('adds commute-aware rule at Unhealthy AQI and emits no alert for Good AQI without vulnerabilities', () => {
    const walkerResult = applyUrgencyRules(
      BASE_RESPONSE,
      { ...DEFAULT_USER_PROFILE, commuteMode: CommuteMode.WALK_OR_BIKE },
      makeAqi(180),
    );
    expect(
      walkerResult.recommendations.some((r) => r.title.includes('Active Outdoor Commuting')),
    ).toBe(true);

    const goodNoAlerts: AssistantResponse = {
      ...BASE_RESPONSE,
      recommendations: [BASE_RESPONSE.recommendations[1]],
    };
    const goodResult = applyUrgencyRules(
      goodNoAlerts,
      {
        ...DEFAULT_USER_PROFILE,
        hasChildren: false,
        hasElderly: false,
        hasRespiratoryCondition: false,
        commuteMode: CommuteMode.PUBLIC_TRANSIT,
        homeType: HomeType.DETACHED_HOUSE,
      },
      { ...makeAqi(35), category: AqiCategoryId.GOOD },
    );
    expect(
      goodResult.recommendations.filter((r) => r.category === RecommendationCategory.HEALTH_ALERT),
    ).toHaveLength(0);
  });
});
