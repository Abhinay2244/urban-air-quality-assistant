/**
 * @module hooks/assistantRunner
 * Responsibility: Execute live (city or coordinates) and manual AQI + recommendation resolution steps.
 * Must not hold React state, manage cooldown timers, or render UI components.
 */
import { ERROR_MESSAGES } from '@shared/constants/http.ts';
import { UI_COPY } from '../constants/uiTheme.ts';
import { createManualAqiData, fetchAqiDataByCity } from '../services/aqiService.ts';
import { getAirQualityRecommendations } from '../services/geminiService.ts';
import { isAbortError } from '../services/httpClient.ts';
import {
  type AppError,
  type AqiData,
  type AssistantResponse,
  type Coordinates,
  ErrorCode,
  type UserProfile,
} from '@shared/types/index.ts';
import { toAppError } from '@shared/utils/errors.ts';
import { applyUrgencyRules } from '../utils/urgencyRules.ts';

/** Last executed recommendation request parameters used for mode-preserving retry. */
export type LastAssistantRequest =
  | { mode: 'live'; profile: UserProfile; coordinates?: Coordinates }
  | { mode: 'manual'; profile: UserProfile; aqi: number; pm25?: number; pm10?: number };

/** Return value contract of the useAssistant custom hook. */
export interface UseAssistantResult {
  aqiData: AqiData | null;
  assistantResponse: AssistantResponse | null;
  isLoading: boolean;
  isAqiUnavailable: boolean;
  cooldownSeconds: number;
  cooldownNotice: string | null;
  error: AppError | null;
  requestRecommendations: (profile: UserProfile, coordinates?: Coordinates) => Promise<void>;
  requestRecommendationsWithManualAqi: (
    profile: UserProfile,
    aqi: number,
    pm25?: number,
    pm10?: number,
  ) => Promise<void>;
  enableManualAqi: () => void;
  retryLastRequest: () => Promise<void>;
  clearError: () => void;
}

/** Formatted notice shown when a user triggers a request during submit cooldown. */
export function formatCooldownNotice(cooldownSeconds: number): string {
  const unit =
    cooldownSeconds === 1
      ? UI_COPY.COOLDOWN_NOTICE_SINGULAR_UNIT
      : UI_COPY.COOLDOWN_NOTICE_PLURAL_UNIT;
  return `${UI_COPY.COOLDOWN_NOTICE_PREFIX} ${cooldownSeconds} ${unit}`;
}

async function resolveAqiStep(
  req: LastAssistantRequest,
  signal: AbortSignal,
): Promise<{ aqiData?: AqiData; error?: AppError; markAqiUnavailable?: boolean }> {
  const isManual = req.mode === 'manual';
  try {
    const aqiData = isManual
      ? createManualAqiData(req.profile.city, req.aqi, req.pm25, req.pm10)
      : await fetchAqiDataByCity(req.profile.city, signal, req.coordinates);
    return { aqiData };
  } catch (err: unknown) {
    if (signal.aborted || isAbortError(err)) {
      throw err;
    }
    const fallbackCode = isManual ? ErrorCode.VALIDATION_ERROR : ErrorCode.AQI_FETCH_ERROR;
    const fallbackMsg = isManual
      ? ERROR_MESSAGES.INVALID_MANUAL_AQI
      : ERROR_MESSAGES.AQI_FETCH_FAILED;
    const appErr = toAppError(err, fallbackCode, fallbackMsg);
    return {
      error: appErr,
      markAqiUnavailable:
        isManual ||
        appErr.code === ErrorCode.AQI_FETCH_ERROR ||
        appErr.code === ErrorCode.CITY_NOT_FOUND,
    };
  }
}

async function fetchRecommendationsStep(
  req: LastAssistantRequest,
  aqiData: AqiData,
  signal: AbortSignal,
): Promise<{ response?: AssistantResponse; error?: AppError; markAqiUnavailable?: boolean }> {
  try {
    const rawResponse = await getAirQualityRecommendations(req.profile, aqiData, signal);
    return { response: applyUrgencyRules(rawResponse, req.profile, aqiData) };
  } catch (err: unknown) {
    if (signal.aborted || isAbortError(err)) {
      throw err;
    }
    return {
      error: toAppError(err, ErrorCode.AI_SERVICE_ERROR, ERROR_MESSAGES.AI_REQUEST_FAILED),
      markAqiUnavailable: req.mode === 'manual',
    };
  }
}

/**
 * Resolves AQI data (by city or manual entry) and fetches urgency-ranked AI recommendations.
 */
export async function executeAssistantRequest(
  req: LastAssistantRequest,
  signal: AbortSignal,
  onResolvedAqi: (aqiData: AqiData) => void,
): Promise<{ response?: AssistantResponse; error?: AppError; markAqiUnavailable?: boolean }> {
  const aqiStep = await resolveAqiStep(req, signal);
  if (!aqiStep.aqiData) {
    return aqiStep;
  }
  if (signal.aborted) {
    return {};
  }
  onResolvedAqi(aqiStep.aqiData);

  return fetchRecommendationsStep(req, aqiStep.aqiData, signal);
}
