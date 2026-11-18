import { AQI_CATEGORIES, MAX_STANDARD_AQI, MIN_STANDARD_AQI } from '../constants/aqi.ts';
import { INPUT_LIMITS } from '../constants/limits.ts';
import { AQICategoryId, type AQICategoryInfo, type Recommendation } from '../types/index.ts';
import { clampRounded } from './math.ts';

const PERCENT_DIVISOR = 100;

/**
 * Resolves the standard AQI tier metadata for a numeric US AQI value.
 */
export function getAQICategoryByValue(aqi: number): AQICategoryInfo {
  const clamped = clampRounded(aqi, MIN_STANDARD_AQI, MAX_STANDARD_AQI);
  const match = AQI_CATEGORIES.find(
    (category) => clamped >= category.minAqi && clamped <= category.maxAqi,
  );
  return match ?? AQI_CATEGORIES[AQI_CATEGORIES.length - 1];
}

/**
 * Looks up AQI tier metadata by category identifier.
 */
export function getAQICategoryInfo(categoryId: AQICategoryId): AQICategoryInfo {
  const match = AQI_CATEGORIES.find((category) => category.id === categoryId);
  return match ?? AQI_CATEGORIES[0];
}

/**
 * Calculates combined sequential PM2.5 exposure reduction across recommendations.
 * Uses independent multiplicative reduction: `1 - prod(1 - clamp(r_i, 0, 100) / 100)`,
 * rounded and bounded strictly between 0 and 100 percent.
 */
export function calculateTotalPM25Reduction(recommendations: readonly Recommendation[]): number {
  if (recommendations.length === 0) {
    return 0;
  }

  const remainingFraction = recommendations.reduce((acc, rec) => {
    const bounded = clampRounded(
      rec.estimatedPM25Reduction,
      INPUT_LIMITS.MIN_PM25_REDUCTION,
      INPUT_LIMITS.MAX_PM25_REDUCTION,
    );
    return acc * (1 - bounded / PERCENT_DIVISOR);
  }, 1);

  return clampRounded(
    (1 - remainingFraction) * PERCENT_DIVISOR,
    INPUT_LIMITS.MIN_PM25_REDUCTION,
    INPUT_LIMITS.MAX_PM25_REDUCTION,
  );
}
