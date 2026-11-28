/**
 * @module server/geminiSchema
 * Responsibility: Define the structured JSON output schema enforced on all Gemini recommendation calls.
 * Must not contain runtime Express handlers, API keys, or prompt text builders.
 */
import { Type, type Schema } from '@google/genai';
import { INPUT_LIMITS } from '../../shared/constants/limits.ts';
import { ASSISTANT_SCHEMA_DESCRIPTIONS } from '../../shared/constants/prompts.ts';

/**
 * Structured JSON response schema shared across every model in GEMINI_MODEL_CHAIN.
 */
export const ASSISTANT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  description: ASSISTANT_SCHEMA_DESCRIPTIONS.ROOT,
  properties: {
    summary: { type: Type.STRING, description: ASSISTANT_SCHEMA_DESCRIPTIONS.SUMMARY },
    priorityGuidance: {
      type: Type.STRING,
      description: ASSISTANT_SCHEMA_DESCRIPTIONS.PRIORITY_GUIDANCE,
    },
    recommendations: {
      type: Type.ARRAY,
      description: ASSISTANT_SCHEMA_DESCRIPTIONS.RECOMMENDATIONS,
      minItems: String(INPUT_LIMITS.MIN_RECOMMENDATIONS),
      maxItems: String(INPUT_LIMITS.MAX_RECOMMENDATIONS),
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: ASSISTANT_SCHEMA_DESCRIPTIONS.TITLE },
          category: { type: Type.STRING, description: ASSISTANT_SCHEMA_DESCRIPTIONS.CATEGORY },
          action: { type: Type.STRING, description: ASSISTANT_SCHEMA_DESCRIPTIONS.ACTION },
          impactExplanation: {
            type: Type.STRING,
            description: ASSISTANT_SCHEMA_DESCRIPTIONS.IMPACT_EXPLANATION,
          },
          estimatedPM25Reduction: {
            type: Type.NUMBER,
            description: ASSISTANT_SCHEMA_DESCRIPTIONS.ESTIMATED_PM25_REDUCTION,
          },
        },
        required: ['title', 'category', 'action', 'impactExplanation', 'estimatedPM25Reduction'],
      },
    },
  },
  required: ['summary', 'priorityGuidance', 'recommendations'],
};
