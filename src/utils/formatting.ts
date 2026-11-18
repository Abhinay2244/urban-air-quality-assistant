import { AQI_CATEGORIES, MAX_STANDARD_AQI, MIN_STANDARD_AQI } from '../constants/aqi.ts';
import { APP_TEXT } from '../constants/config.ts';
import {
  AQICategoryId,
  type AQICategoryInfo,
  type Recommendation,
  RecommendationCategory,
  UrgencyLevel,
} from '../types/index.ts';

const PERCENT_DIVISOR = 100;
const DECIMAL_PLACES = 1;

const RECOMMENDATION_CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  [RecommendationCategory.DAILY_ROUTINE]: 'Daily Routine (Low-Emission)',
  [RecommendationCategory.INDOOR_AIR]: 'Indoor Air Hacks',
  [RecommendationCategory.SUSTAINABLE_ALTERNATIVE]: 'Sustainable Alternatives',
  [RecommendationCategory.HEALTH_ALERT]: 'Health Alerts',
};

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  [UrgencyLevel.CRITICAL]: 'Urgent Priority',
  [UrgencyLevel.HIGH]: 'High Priority',
  [UrgencyLevel.STANDARD]: 'Standard',
};

/**
 * Resolves the standard AQI tier metadata for a numeric US AQI value.
 */
export function getAQICategoryByValue(aqi: number): AQICategoryInfo {
  const clamped = Math.min(
    MAX_STANDARD_AQI,
    Math.max(MIN_STANDARD_AQI, Math.round(Number.isFinite(aqi) ? aqi : MIN_STANDARD_AQI)),
  );
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
 * Formats a PM2.5 reading with standard concentration units.
 */
export function formatPM25Value(value: number): string {
  const safeValue = Number.isFinite(value) && value >= 0 ? value : 0;
  return `${safeValue.toFixed(DECIMAL_PLACES)} ${APP_TEXT.PM25_UNIT}`;
}

/**
 * Formats an ISO timestamp string into a concise local date/time string.
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString();
}

/**
 * Calculates combined sequential PM2.5 exposure reduction across recommendations (0-100%).
 */
export function calculateTotalPM25Reduction(recommendations: readonly Recommendation[]): number {
  if (recommendations.length === 0) {
    return 0;
  }

  const remainingFraction = recommendations.reduce((acc, rec) => {
    const clamped = Math.min(PERCENT_DIVISOR, Math.max(0, rec.estimatedPM25Reduction));
    return acc * (1 - clamped / PERCENT_DIVISOR);
  }, 1);

  return Math.round((1 - remainingFraction) * PERCENT_DIVISOR);
}

/**
 * Maps a RecommendationCategory enum value to a human-readable label.
 */
export function formatCategoryLabel(category: RecommendationCategory): string {
  return RECOMMENDATION_CATEGORY_LABELS[category];
}

/**
 * Maps an UrgencyLevel enum value to a human-readable label.
 */
export function formatUrgencyLabel(urgency: UrgencyLevel): string {
  return URGENCY_LABELS[urgency];
}
