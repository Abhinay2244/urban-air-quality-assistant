import { describe, expect, it } from 'vitest';
import { RecommendationCategory } from '../../types/index.ts';
import {
  calculateTotalPM25Reduction,
  formatCategoryLabel,
  formatPM25Value,
} from '../../utils/formatting.ts';

describe('formatting utilities', () => {
  it('formats PM2.5 readings with units and guards negative numbers', () => {
    expect(formatPM25Value(42.56)).toBe('42.6 ug/m3');
    expect(formatPM25Value(-5)).toBe('0.0 ug/m3');
  });

  it('calculates combined multiplicative PM2.5 reduction without exceeding 100%', () => {
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

  it('maps recommendation categories to readable labels', () => {
    expect(formatCategoryLabel(RecommendationCategory.INDOOR_AIR)).toBe('Indoor Air Hacks');
    expect(formatCategoryLabel(RecommendationCategory.SUSTAINABLE_ALTERNATIVE)).toBe(
      'Sustainable Alternatives',
    );
    expect(formatCategoryLabel(RecommendationCategory.HEALTH_ALERT)).toBe('Health Alerts');
  });
});
