/**
 * @module hooks/assistantRunner
 * Responsibility: Execute live (city or coordinates) and manual AQI + recommendation resolution steps.
 * Must not hold React state, manage cooldown timers, or render UI components.
 */
import { APP_TEXT } from '../constants/config.ts';
import { ERROR_MESSAGES } from '../constants/http.ts';
import { INPUT_LIMITS } from '../constants/limits.ts';
import { UI_COPY } from '../constants/uiTheme.ts';
import {
  createManualAqiData,
  fetchAqiDataByCity,
  fetchAqiDataByCoordinates,
} from '../services/aqiService.ts';
import { getAirQualityRecommendations } from '../services/geminiService.ts';
import { isAbortError } from '../services/httpClient.ts';
import {
  type AppError,
  type AqiData,
  type AssistantResponse,
  type Coordinates,
  ErrorCode,
  type UserProfile,
} from '../types/index.ts';
import { toAppError } from '../utils/errors.ts';
import { sanitizeText } from '../utils/sanitizing.ts';
import { applyUrgencyRules } from '../utils/urgencyRules.ts';

/** Last executed recommendation request parameters used for mode-preserving retry. */
export type LastAssistantRequest =
  | { mode: 'live'; profile: UserProfile; coordinates?: Coordinates; useCoordinatesOnly?: boolean }
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
  requestRecommendationsByLocation: (
    profile: UserProfile,
    coordinates: Coordinates,
  ) => Promise<void>;
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

function resolveCoordinateCity(city: string): string {
  const cleanCity = sanitizeText(city, INPUT_LIMITS.MAX_CITY_LENGTH);
  return cleanCity.length >= INPUT_LIMITS.MIN_CITY_LENGTH
    ? cleanCity
    : APP_TEXT.DEFAULT_LOCATION_CITY;
}

/**
 * Resolves AQI data (by city, coordinates, or manual entry) and fetches urgency-ranked AI recommendations.
 */
export async function executeAssistantRequest(
  req: LastAssistantRequest,
  signal: AbortSignal,
  onResolvedAqi: (aqiData: AqiData) => void,
): Promise<{ response?: AssistantResponse; error?: AppError; markAqiUnavailable?: boolean }> {
  let resolvedAqi: AqiData;
  const isManual = req.mode === 'manual';

  try {
    if (isManual) {
      resolvedAqi = createManualAqiData(req.profile.city, req.aqi, req.pm25, req.pm10);
    } else if (req.useCoordinatesOnly && req.coordinates) {
      resolvedAqi = await fetchAqiDataByCoordinates(req.coordinates, signal);
    } else {
      resolvedAqi = await fetchAqiDataByCity(req.profile.city, signal, req.coordinates);
    }
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
  const isCoordLookup = req.mode === 'live' && Boolean(req.useCoordinatesOnly);
  const normalizedCity = isCoordLookup ? resolveCoordinateCity(resolvedAqi.city) : resolvedAqi.city;
  const normalizedAqi =
    normalizedCity === resolvedAqi.city ? resolvedAqi : { ...resolvedAqi, city: normalizedCity };
  onResolvedAqi(normalizedAqi);

  try {
    const profileForAi: UserProfile = isCoordLookup
      ? { ...req.profile, city: normalizedAqi.city }
      : req.profile;
    const rawResponse = await getAirQualityRecommendations(profileForAi, normalizedAqi, signal);
    return { response: applyUrgencyRules(rawResponse, profileForAi, normalizedAqi) };
  } catch (err: unknown) {
    if (signal.aborted || isAbortError(err)) throw err;
    return {
      error: toAppError(err, ErrorCode.AI_SERVICE_ERROR, ERROR_MESSAGES.AI_REQUEST_FAILED),
      markAqiUnavailable: isManual,
    };
  }
}
