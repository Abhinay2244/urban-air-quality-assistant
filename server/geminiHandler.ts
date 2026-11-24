/**
 * @module server/geminiHandler
 * Responsibility: Validate recommendation request payloads and invoke @google/genai on the server.
 * Must not leak GEMINI_API_KEY, parse UI formatting, or apply client-side presentation logic.
 */
import { GoogleGenAI, Type, type Schema } from '@google/genai';
import type { Request, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../src/constants/http.ts';
import {
  ASSISTANT_SCHEMA_DESCRIPTIONS,
  ASSISTANT_SYSTEM_INSTRUCTION,
} from '../src/constants/prompts.ts';
import { GEMINI_CONFIG } from '../src/constants/server.ts';
import { buildAssistantPrompt } from '../src/utils/promptBuilder.ts';
import { sanitizeAqiData } from '../src/utils/sanitizing.ts';
import { isRecord } from '../src/utils/typeGuards.ts';
import { validateAqiData, validateUserProfile } from '../src/utils/validation.ts';
import { logServerError, mapGeminiUpstreamError, sendErrorResponse } from './errorResponse.ts';

const ASSISTANT_RESPONSE_SCHEMA: Schema = {
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

/**
 * Express handler calling Gemini on the server with runtime payload validation and safe error mapping.
 */
export async function handleAssistantRecommendations(req: Request, res: Response): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendErrorResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.AI_SERVICE_ERROR,
      ERROR_MESSAGES.MISSING_API_KEY,
    );
    return;
  }

  if (!isRecord(req.body)) {
    sendErrorResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_MESSAGES.INVALID_REQUEST_BODY,
    );
    return;
  }

  const profileResult = validateUserProfile(req.body.profile);
  if (!profileResult.isValid || !validateAqiData(req.body.aqiData)) {
    sendErrorResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      profileResult.error?.message ?? ERROR_MESSAGES.INVALID_REQUEST_BODY,
    );
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': GEMINI_CONFIG.USER_AGENT } },
    });

    const sanitizedAqi = sanitizeAqiData(req.body.aqiData, profileResult.value.city);
    const response = await ai.models.generateContent({
      model: GEMINI_CONFIG.MODEL,
      contents: buildAssistantPrompt(profileResult.value, sanitizedAqi),
      config: {
        systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
        responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
        responseSchema: ASSISTANT_RESPONSE_SCHEMA,
      },
    });

    res.status(HTTP_STATUS.OK).json({ rawText: response.text ?? '' });
  } catch (error: unknown) {
    logServerError('Gemini Handler', error);
    const mapped = mapGeminiUpstreamError(error);
    sendErrorResponse(res, mapped.status, ERROR_CODES.AI_SERVICE_ERROR, mapped.message);
  }
}
