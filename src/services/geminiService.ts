import { API_ENDPOINTS, ERROR_MESSAGES } from '../constants/config.ts';
import {
  type AQIData,
  type AssistantResponse,
  ErrorCode,
  type UserProfile,
} from '../types/index.ts';
import { parseAndValidateAssistantResponse } from '../utils/assistantParser.ts';
import { createAppError, toAppError } from '../utils/errors.ts';
import {
  isRecord,
  unwrapValidation,
  validateAQIData,
  validateUserProfile,
} from '../utils/validation.ts';
import { fetchJsonOrThrow } from './httpClient.ts';

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
  aqiData: AQIData,
): Promise<AssistantResponse> {
  const safeProfile = unwrapValidation(validateUserProfile(profile), ERROR_MESSAGES.INVALID_CITY);

  if (!validateAQIData(aqiData)) {
    throw createAppError(ErrorCode.VALIDATION_ERROR, ERROR_MESSAGES.INVALID_REQUEST_BODY);
  }

  try {
    const payload = await fetchJsonOrThrow(
      API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: safeProfile, aqiData }),
      },
      ErrorCode.AI_SERVICE_ERROR,
      ERROR_MESSAGES.AI_REQUEST_FAILED,
      isServerAssistantPayload,
    );

    return parseAndValidateAssistantResponse(payload.rawText);
  } catch (error: unknown) {
    throw toAppError(error, ErrorCode.AI_SERVICE_ERROR, ERROR_MESSAGES.AI_REQUEST_FAILED);
  }
}
