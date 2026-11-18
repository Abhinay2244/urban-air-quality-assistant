import { describe, expect, it } from 'vitest';
import { AQICategoryId, RecommendationCategory } from '../../types/index.ts';
import {
  calculateTotalPM25Reduction,
  getAQICategoryByValue,
  getAQICategoryInfo,
} from '../../utils/aqiCalculations.ts';
import { clampRounded } from '../../utils/math.ts';

describe('math and AQI calculation utilities', () => {
  it('clamps and rounds values inclusively and handles non-finite numbers', () => {
    expect(clampRounded(42.6, 0, 100)).toBe(43);
    expect(clampRounded(150, 0, 100)).toBe(100);
    expect(clampRounded(Number.NaN, 5, 100)).toBe(5);
  });

  it('calculates combined multiplicative PM2.5 reduction bounded between 0 and 100', () => {
    const total = calculateTotalPM25Reduction([
      {
        title: 'A',
        category: RecommendationCategory.INDOOR_AIR,
        action: 'Action A',
        impactExplanation: 'Impact A',
        estimatedPM25Reduction: 50,
      },
      {
        title: 'B',
        category: RecommendationCategory.DAILY_ROUTINE,
        action: 'Action B',
        impactExplanation: 'Impact B',
        estimatedPM25Reduction: 50,
      },
    ]);

    expect(total).toBe(75);
    expect(calculateTotalPM25Reduction([])).toBe(0);
  });

  it('resolves AQI category info by id and value', () => {
    expect(getAQICategoryByValue(215).id).toBe(AQICategoryId.VERY_UNHEALTHY);
    expect(getAQICategoryInfo(AQICategoryId.GOOD).label).toBe('Good');
  });
});
