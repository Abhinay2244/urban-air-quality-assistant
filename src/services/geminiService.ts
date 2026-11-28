/**
 * @module services/geminiService
 * Responsibility: Request AI recommendations from the server endpoint and return parsed, validated responses.
 * Must not embed Gemini API keys, manage UI state, or apply dynamic urgency rules directly.
 */
import { API_ENDPOINTS, ERROR_MESSAGES } from '@shared/constants/http.ts';
import {
  type AqiData,
  type AssistantResponse,
  ErrorCode,
  type UserProfile,
} from '@shared/types/index.ts';
import { parseAndValidateAssistantResponse } from '@shared/utils/assistantParser.ts';
import { createAppError, toAppError } from '@shared/utils/errors.ts';
import { isRecord } from '@shared/utils/typeGuards.ts';
import {
  unwrapValidation,
  validateAqiData,
  validateUserProfile,
} from '@shared/utils/validation.ts';
import { fetchJsonOrThrow, isAbortError } from './httpClient.ts';

interface ServerAssistantPayload {
  rawText: string;
}

function isServerAssistantPayload(raw: unknown): raw is ServerAssistantPayload {
  return isRecord(raw) && typeof raw.rawText === 'string';
}

/**
 * Generates tailored air quality recommendations via the server Gemini endpoint,
 * validating the parsed JSON output and falling back safely if parsing fails.
 */
export async function getAirQualityRecommendations(
  profile: UserProfile,
  aqiData: AqiData,
  signal?: AbortSignal,
): Promise<AssistantResponse> {
  const safeProfile = unwrapValidation(validateUserProfile(profile), ERROR_MESSAGES.INVALID_CITY);

  if (!validateAqiData(aqiData)) {
    throw createAppError(ErrorCode.VALIDATION_ERROR, ERROR_MESSAGES.INVALID_REQUEST_BODY);
  }

  try {
    const payload = await fetchJsonOrThrow(API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS, {
      init: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: safeProfile, aqiData }),
        ...(signal !== undefined ? { signal } : {}),
      },
      fallbackCode: ErrorCode.AI_SERVICE_ERROR,
      fallbackMessage: ERROR_MESSAGES.AI_REQUEST_FAILED,
      guard: isServerAssistantPayload,
    });

    return parseAndValidateAssistantResponse(payload.rawText);
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }
    throw toAppError(error, ErrorCode.AI_SERVICE_ERROR, ERROR_MESSAGES.AI_REQUEST_FAILED);
  }
}
