/**
 * @module services/geminiService
 * Responsibility: Request AI recommendations from the server endpoint and return parsed, validated responses.
 * Must not embed Gemini API keys, manage UI state, or apply dynamic urgency rules directly.
 */
import { API_ENDPOINTS, ERROR_MESSAGES } from '../constants/http.ts';
import {
  type AqiData,
  type AssistantResponse,
  ErrorCode,
  type UserProfile,
} from '../types/index.ts';
import { parseAndValidateAssistantResponse } from '../utils/assistantParser.ts';
import { createAppError, toAppError } from '../utils/errors.ts';
import { isRecord } from '../utils/typeGuards.ts';
import { unwrapValidation, validateAqiData, validateUserProfile } from '../utils/validation.ts';
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
    const payload = await fetchJsonOrThrow(
      API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: safeProfile, aqiData }),
        signal,
      },
      ErrorCode.AI_SERVICE_ERROR,
      ERROR_MESSAGES.AI_REQUEST_FAILED,
      isServerAssistantPayload,
    );

    return parseAndValidateAssistantResponse(payload.rawText);
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }
    throw toAppError(error, ErrorCode.AI_SERVICE_ERROR, ERROR_MESSAGES.AI_REQUEST_FAILED);
  }
}
