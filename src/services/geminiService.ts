import { API_ENDPOINTS, ERROR_MESSAGES } from '../constants/config.ts';
import {
  type AQIData,
  type AssistantResponse,
  ErrorCode,
  type UserProfile,
} from '../types/index.ts';
import { parseAndValidateAssistantResponse } from '../utils/assistantParser.ts';
import { createAppError, isAppError, toAppError } from '../utils/errors.ts';
import { validateAQIData, validateUserProfile } from '../utils/validation.ts';

interface ServerAssistantPayload {
  rawText?: string;
}

/**
 * Generates tailored air quality recommendations via the server Gemini endpoint,
 * validating the parsed JSON output and falling back safely if parsing fails.
 */
export async function getAirQualityRecommendations(
  profile: UserProfile,
  aqiData: AQIData,
): Promise<AssistantResponse> {
  const profileValidation = validateUserProfile(profile);
  if (!profileValidation.isValid || profileValidation.error) {
    throw (
      profileValidation.error ??
      createAppError(ErrorCode.VALIDATION_ERROR, ERROR_MESSAGES.INVALID_CITY)
    );
  }

  if (!validateAQIData(aqiData)) {
    throw createAppError(ErrorCode.VALIDATION_ERROR, ERROR_MESSAGES.INVALID_REQUEST_BODY);
  }

  try {
    const response = await fetch(API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: profileValidation.value,
        aqiData,
      }),
    });

    if (!response.ok) {
      const errorPayload: unknown = await response.json().catch(() => null);
      if (isAppError(errorPayload)) {
        throw errorPayload;
      }
      throw createAppError(ErrorCode.AI_SERVICE_ERROR, ERROR_MESSAGES.AI_REQUEST_FAILED);
    }

    const payload = (await response.json()) as ServerAssistantPayload;
    return parseAndValidateAssistantResponse(payload.rawText ?? '');
  } catch (error: unknown) {
    throw toAppError(error, ErrorCode.AI_SERVICE_ERROR, ERROR_MESSAGES.AI_REQUEST_FAILED);
  }
}
