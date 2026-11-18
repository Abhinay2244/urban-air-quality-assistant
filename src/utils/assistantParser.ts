import { INPUT_LIMITS } from '../constants/config.ts';
import { SAFE_FALLBACK_ASSISTANT_RESPONSE } from '../constants/prompts.ts';
import {
  type AssistantResponse,
  type Recommendation,
  RecommendationCategory,
} from '../types/index.ts';
import { sanitizeText } from './sanitizing.ts';

function normalizeRecommendation(raw: unknown): Recommendation | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const title = sanitizeText(String(item.title ?? ''), INPUT_LIMITS.MAX_RECOMMENDATION_TEXT_LENGTH);
  const action = sanitizeText(
    String(item.action ?? ''),
    INPUT_LIMITS.MAX_RECOMMENDATION_TEXT_LENGTH,
  );
  const impactExplanation = sanitizeText(
    String(item.impactExplanation ?? ''),
    INPUT_LIMITS.MAX_RECOMMENDATION_TEXT_LENGTH,
  );

  if (!title || !action || !impactExplanation) {
    return null;
  }

  const category = Object.values(RecommendationCategory).includes(
    item.category as RecommendationCategory,
  )
    ? (item.category as RecommendationCategory)
    : RecommendationCategory.DAILY_ROUTINE;

  const rawReduction = Number(item.estimatedPM25Reduction);
  const clampedReduction = Number.isFinite(rawReduction)
    ? Math.min(
        INPUT_LIMITS.MAX_PM25_REDUCTION,
        Math.max(INPUT_LIMITS.MIN_PM25_REDUCTION, Math.round(rawReduction)),
      )
    : INPUT_LIMITS.MIN_PM25_REDUCTION;

  return { title, category, action, impactExplanation, estimatedPM25Reduction: clampedReduction };
}

/**
 * Parses and validates raw JSON text from Gemini into a typed AssistantResponse,
 * returning a safe validated fallback if parsing or schema checks fail.
 */
export function parseAndValidateAssistantResponse(rawText: string): AssistantResponse {
  try {
    const parsed: unknown = JSON.parse(rawText.trim());
    if (typeof parsed !== 'object' || parsed === null) {
      return SAFE_FALLBACK_ASSISTANT_RESPONSE;
    }

    const candidate = parsed as Record<string, unknown>;
    const summary = sanitizeText(String(candidate.summary ?? ''), INPUT_LIMITS.MAX_SUMMARY_LENGTH);
    const priorityGuidance = sanitizeText(
      String(candidate.priorityGuidance ?? ''),
      INPUT_LIMITS.MAX_SUMMARY_LENGTH,
    );
    const rawList = Array.isArray(candidate.recommendations) ? candidate.recommendations : [];
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
      isFallback: Boolean(candidate.isFallback),
    };
  } catch {
    return SAFE_FALLBACK_ASSISTANT_RESPONSE;
  }
}
