/**
 * @module hooks/assistantRunner
 * Responsibility: Execute live and manual AQI + recommendation resolution steps with AbortSignal support.
 * Must not hold React state, manage cooldown timers, or render UI components.
 */
import { ERROR_MESSAGES } from '../constants/http.ts';
import { UI_COPY } from '../constants/uiTheme.ts';
import { createManualAqiData, fetchAqiDataByCity } from '../services/aqiService.ts';
import { getAirQualityRecommendations } from '../services/geminiService.ts';
import { isAbortError } from '../services/httpClient.ts';
import {
  type AppError,
  type AqiData,
  type AssistantResponse,
  ErrorCode,
  type UserProfile,
} from '../types/index.ts';
import { toAppError } from '../utils/errors.ts';
import { applyUrgencyRules } from '../utils/urgencyRules.ts';

/** Last executed recommendation request parameters used for mode-preserving retry. */
export type LastAssistantRequest =
  | { mode: 'live'; profile: UserProfile }
  | { mode: 'manual'; profile: UserProfile; aqi: number; pm25?: number };

/** Formatted notice shown when a user triggers a request during submit cooldown. */
export function formatCooldownNotice(cooldownSeconds: number): string {
  const unit =
    cooldownSeconds === 1
      ? UI_COPY.COOLDOWN_NOTICE_SINGULAR_UNIT
      : UI_COPY.COOLDOWN_NOTICE_PLURAL_UNIT;
  return `${UI_COPY.COOLDOWN_NOTICE_PREFIX} ${cooldownSeconds} ${unit}`;
}

/**
 * Resolves AQI data (live or manual) and fetches urgency-ranked AI recommendations.
 * Returns normalized error outcomes while propagating AbortError cancellations untouched.
 */
export async function executeAssistantRequest(
  req: LastAssistantRequest,
  signal: AbortSignal,
  onResolvedAqi: (aqiData: AqiData) => void,
): Promise<{ response?: AssistantResponse; error?: AppError; markAqiUnavailable?: boolean }> {
  let resolvedAqi: AqiData;
  const isManual = req.mode === 'manual';

  try {
    resolvedAqi = isManual
      ? createManualAqiData(req.profile.city, req.aqi, req.pm25)
      : await fetchAqiDataByCity(req.profile.city, signal);
  } catch (err: unknown) {
    if (signal.aborted || isAbortError(err)) throw err;
    const fallbackCode = isManual ? ErrorCode.VALIDATION_ERROR : ErrorCode.AQI_FETCH_ERROR;
    const fallbackMsg = isManual
      ? ERROR_MESSAGES.INVALID_MANUAL_AQI
      : ERROR_MESSAGES.AQI_FETCH_FAILED;
    const appErr = toAppError(err, fallbackCode, fallbackMsg);
    const markAqiUnavailable =
      isManual ||
      appErr.code === ErrorCode.AQI_FETCH_ERROR ||
      appErr.code === ErrorCode.CITY_NOT_FOUND;
    return { error: appErr, markAqiUnavailable };
  }

  if (signal.aborted) return {};
  onResolvedAqi(resolvedAqi);

  try {
    const rawResponse = await getAirQualityRecommendations(req.profile, resolvedAqi, signal);
    return { response: applyUrgencyRules(rawResponse, req.profile, resolvedAqi) };
  } catch (err: unknown) {
    if (signal.aborted || isAbortError(err)) throw err;
    return {
      error: toAppError(err, ErrorCode.AI_SERVICE_ERROR, ERROR_MESSAGES.AI_REQUEST_FAILED),
      markAqiUnavailable: isManual,
    };
  }
}
