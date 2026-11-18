import { INPUT_LIMITS } from '../constants/config.ts';
import { SAFE_FALLBACK_ASSISTANT_RESPONSE } from '../constants/prompts.ts';
import {
  type AssistantResponse,
  type Recommendation,
  RecommendationCategory,
} from '../types/index.ts';
import { clampRounded } from './math.ts';
import { sanitizeText } from './sanitizing.ts';
import { isOneOf, isRecord } from './typeGuards.ts';

const VALID_CATEGORIES: readonly RecommendationCategory[] = Object.values(RecommendationCategory);

/**
 * Extracts and sanitizes a string field, returning an empty string for non-strings.
 */
export function readStringField(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  return sanitizeText(value, maxLen);
}

function parseCategory(value: unknown): RecommendationCategory {
  return isOneOf(value, VALID_CATEGORIES) ? value : RecommendationCategory.DAILY_ROUTINE;
}

function normalizeRecommendation(raw: unknown): Recommendation | null {
  if (!isRecord(raw)) {
    return null;
  }

  const title = readStringField(raw.title, INPUT_LIMITS.MAX_RECOMMENDATION_TEXT_LENGTH);
  const action = readStringField(raw.action, INPUT_LIMITS.MAX_RECOMMENDATION_TEXT_LENGTH);
  const impactExplanation = readStringField(
    raw.impactExplanation,
    INPUT_LIMITS.MAX_RECOMMENDATION_TEXT_LENGTH,
  );

  if (!title || !action || !impactExplanation) {
    return null;
  }

  const rawReduction =
    typeof raw.estimatedPM25Reduction === 'number' ? raw.estimatedPM25Reduction : NaN;
  const estimatedPM25Reduction = clampRounded(
    rawReduction,
    INPUT_LIMITS.MIN_PM25_REDUCTION,
    INPUT_LIMITS.MAX_PM25_REDUCTION,
  );

  return {
    title,
    category: parseCategory(raw.category),
    action,
    impactExplanation,
    estimatedPM25Reduction,
  };
}

/**
 * Parses and validates raw JSON text from Gemini into a typed AssistantResponse,
 * returning a safe validated fallback if parsing or schema checks fail.
 */
export function parseAndValidateAssistantResponse(rawText: string): AssistantResponse {
  try {
    const parsed: unknown = JSON.parse(rawText.trim());
    if (!isRecord(parsed)) {
      return SAFE_FALLBACK_ASSISTANT_RESPONSE;
    }

    const summary = readStringField(parsed.summary, INPUT_LIMITS.MAX_SUMMARY_LENGTH);
    const priorityGuidance = readStringField(
      parsed.priorityGuidance,
      INPUT_LIMITS.MAX_SUMMARY_LENGTH,
    );
    const rawList = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    const recommendations = rawList
      .map(normalizeRecommendation)
      .filter((item): item is Recommendation => item !== null)
      .slice(0, INPUT_LIMITS.MAX_RECOMMENDATIONS);

    if (
      !summary ||
      !priorityGuidance ||
      recommendations.length < INPUT_LIMITS.MIN_RECOMMENDATIONS
    ) {
      return SAFE_FALLBACK_ASSISTANT_RESPONSE;
    }

    return {
      summary,
      priorityGuidance,
      recommendations,
      isFallback: Boolean(parsed.isFallback),
    };
  } catch {
    return SAFE_FALLBACK_ASSISTANT_RESPONSE;
  }
}
