import { useCallback, useRef, useState } from 'react';
import { ERROR_MESSAGES } from '../constants/config.ts';
import { createManualAQIData, fetchAQIDataByCity } from '../services/aqiService.ts';
import { getAirQualityRecommendations } from '../services/geminiService.ts';
import {
  type AppError,
  type AQIData,
  type AssistantResponse,
  ErrorCode,
  type UserProfile,
} from '../types/index.ts';
import { toAppError } from '../utils/errors.ts';
import { applyUrgencyRules } from '../utils/urgencyRules.ts';
import { useCooldown } from './useCooldown.ts';

type LastRequest =
  | { mode: 'live'; profile: UserProfile }
  | { mode: 'manual'; profile: UserProfile; aqi: number; pm25?: number };

/** Return value of the useAssistant custom hook. */
export interface UseAssistantResult {
  aqiData: AQIData | null;
  assistantResponse: AssistantResponse | null;
  isLoading: boolean;
  isAqiUnavailable: boolean;
  cooldownSeconds: number;
  error: AppError | null;
  generatePlan: (profile: UserProfile) => Promise<void>;
  generatePlanWithManualAqi: (profile: UserProfile, aqi: number, pm25?: number) => Promise<void>;
  enableManualAqi: () => void;
  retryLastRequest: () => Promise<void>;
  clearError: () => void;
}

/**
 * Orchestrates live/manual AQI lookup, GenAI recommendations, rule-based urgency,
 * mode-preserving retry, and submit cooldown rate limiting.
 */
export function useAssistant(): UseAssistantResult {
  const [aqiData, setAqiData] = useState<AQIData | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAqiUnavailable, setIsAqiUnavailable] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const lastRequestRef = useRef<LastRequest | null>(null);
  const { cooldownSeconds, startCooldown, resetCooldown } = useCooldown();

  const clearError = useCallback((): void => setError(null), []);
  const enableManualAqi = useCallback((): void => {
    setIsAqiUnavailable(true);
    setError(null);
  }, []);

  const generateForResolvedAqi = useCallback(
    async (profile: UserProfile, resolvedAqi: AQIData, manualMode: boolean): Promise<void> => {
      setAqiData(resolvedAqi);
      try {
        const rawPlan = await getAirQualityRecommendations(profile, resolvedAqi);
        setIsAqiUnavailable(false);
        setAssistantResponse(applyUrgencyRules(rawPlan, profile, resolvedAqi));
      } catch (err: unknown) {
        if (manualMode) setIsAqiUnavailable(true);
        setError(toAppError(err, ErrorCode.AI_SERVICE_ERROR, ERROR_MESSAGES.AI_REQUEST_FAILED));
      }
    },
    [],
  );

  const runRequest = useCallback(
    async (req: LastRequest): Promise<void> => {
      lastRequestRef.current = req;
      setIsLoading(true);
      setError(null);
      startCooldown();
      try {
        if (req.mode === 'manual') {
          try {
            const manual = createManualAQIData(req.profile.city, req.aqi, req.pm25);
            await generateForResolvedAqi(req.profile, manual, true);
          } catch (err: unknown) {
            setIsAqiUnavailable(true);
            setError(
              toAppError(err, ErrorCode.VALIDATION_ERROR, ERROR_MESSAGES.INVALID_MANUAL_AQI),
            );
          }
          return;
        }
        setIsAqiUnavailable(false);
        try {
          const liveAqi = await fetchAQIDataByCity(req.profile.city);
          await generateForResolvedAqi(req.profile, liveAqi, false);
        } catch (err: unknown) {
          const appErr = toAppError(
            err,
            ErrorCode.AQI_FETCH_ERROR,
            ERROR_MESSAGES.AQI_FETCH_FAILED,
          );
          if (
            appErr.code === ErrorCode.AQI_FETCH_ERROR ||
            appErr.code === ErrorCode.CITY_NOT_FOUND
          ) {
            setIsAqiUnavailable(true);
          }
          setError(appErr);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [generateForResolvedAqi, startCooldown],
  );

  const generatePlan = useCallback(
    async (profile: UserProfile): Promise<void> => {
      if (cooldownSeconds === 0 && !isLoading) await runRequest({ mode: 'live', profile });
    },
    [cooldownSeconds, isLoading, runRequest],
  );

  const generatePlanWithManualAqi = useCallback(
    async (profile: UserProfile, aqi: number, pm25?: number): Promise<void> => {
      if (!isLoading) await runRequest({ mode: 'manual', profile, aqi, pm25 });
    },
    [isLoading, runRequest],
  );

  const retryLastRequest = useCallback(async (): Promise<void> => {
    if (!lastRequestRef.current || isLoading) return;
    resetCooldown();
    await runRequest(lastRequestRef.current);
  }, [isLoading, resetCooldown, runRequest]);

  return {
    aqiData,
    assistantResponse,
    isLoading,
    isAqiUnavailable,
    cooldownSeconds,
    error,
    generatePlan,
    generatePlanWithManualAqi,
    enableManualAqi,
    retryLastRequest,
    clearError,
  };
}
