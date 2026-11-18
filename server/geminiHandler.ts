import { GoogleGenAI, Type, type Schema } from '@google/genai';
import type { Request, Response } from 'express';
import {
  ERROR_MESSAGES,
  GEMINI_CONFIG,
  HTTP_STATUS,
  INPUT_LIMITS,
} from '../src/constants/limits.ts';
import {
  ASSISTANT_SCHEMA_DESCRIPTIONS,
  ASSISTANT_SYSTEM_INSTRUCTION,
  buildAssistantPrompt,
} from '../src/constants/prompts.ts';
import type { AQIData, UserProfile } from '../src/types/index.ts';
import { sanitizeText } from '../src/utils/sanitizing.ts';

interface AssistantRequestBody {
  profile?: UserProfile;
  aqiData?: AQIData;
}

const ASSISTANT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  description: ASSISTANT_SCHEMA_DESCRIPTIONS.ROOT,
  properties: {
    summary: {
      type: Type.STRING,
      description: ASSISTANT_SCHEMA_DESCRIPTIONS.SUMMARY,
    },
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
          title: {
            type: Type.STRING,
            description: ASSISTANT_SCHEMA_DESCRIPTIONS.TITLE,
          },
          category: {
            type: Type.STRING,
            description: ASSISTANT_SCHEMA_DESCRIPTIONS.CATEGORY,
          },
          action: {
            type: Type.STRING,
            description: ASSISTANT_SCHEMA_DESCRIPTIONS.ACTION,
          },
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

function isValidPayload(body: AssistantRequestBody): body is Required<AssistantRequestBody> {
  return (
    typeof body.profile === 'object' &&
    body.profile !== null &&
    typeof body.profile.city === 'string' &&
    typeof body.aqiData === 'object' &&
    body.aqiData !== null &&
    typeof body.aqiData.aqi === 'number'
  );
}

/**
 * Express handler calling Gemini on the server with a system instruction and JSON schema.
 */
export async function handleAssistantRecommendations(req: Request, res: Response): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: 'AI_SERVICE_ERROR',
      message: ERROR_MESSAGES.MISSING_API_KEY,
    });
    return;
  }

  const body = (req.body ?? {}) as AssistantRequestBody;
  if (!isValidPayload(body)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      code: 'VALIDATION_ERROR',
      message: ERROR_MESSAGES.INVALID_REQUEST_BODY,
    });
    return;
  }

  const sanitizedProfile: UserProfile = {
    ...body.profile,
    city: sanitizeText(body.profile.city, INPUT_LIMITS.MAX_CITY_LENGTH),
  };

  if (sanitizedProfile.city.length < INPUT_LIMITS.MIN_CITY_LENGTH) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      code: 'VALIDATION_ERROR',
      message: ERROR_MESSAGES.INVALID_CITY,
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': GEMINI_CONFIG.USER_AGENT,
        },
      },
    });

    const response = await ai.models.generateContent({
      model: GEMINI_CONFIG.MODEL,
      contents: buildAssistantPrompt(sanitizedProfile, body.aqiData),
      config: {
        systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
        responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
        responseSchema: ASSISTANT_RESPONSE_SCHEMA,
      },
    });

    res.status(HTTP_STATUS.OK).json({ rawText: response.text ?? '' });
  } catch (error: unknown) {
    const details = error instanceof Error ? error.message : undefined;
    res.status(HTTP_STATUS.BAD_GATEWAY).json({
      code: 'AI_SERVICE_ERROR',
      message: ERROR_MESSAGES.AI_REQUEST_FAILED,
      details,
    });
  }
}
