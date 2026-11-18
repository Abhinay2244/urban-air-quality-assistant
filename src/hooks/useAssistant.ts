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

/**
 * Return value of the useAssistant custom hook.
 */
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
 * Orchestrates live or manual AQI lookup, GenAI recommendations, rule-based urgency,
 * error retry, and submit cooldown rate limiting.
 */
export function useAssistant(): UseAssistantResult {
  const [aqiData, setAqiData] = useState<AQIData | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAqiUnavailable, setIsAqiUnavailable] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const lastProfileRef = useRef<UserProfile | null>(null);
  const { cooldownSeconds, startCooldown, resetCooldown } = useCooldown();

  const clearError = useCallback((): void => setError(null), []);
  const enableManualAqi = useCallback((): void => {
    setIsAqiUnavailable(true);
    setError(null);
  }, []);

  const executeLivePlan = useCallback(
    async (profile: UserProfile): Promise<void> => {
      lastProfileRef.current = profile;
      setIsLoading(true);
      setError(null);
      setIsAqiUnavailable(false);
      startCooldown();

      try {
        const liveAqi = await fetchAQIDataByCity(profile.city);
        setAqiData(liveAqi);
        const rawPlan = await getAirQualityRecommendations(profile, liveAqi);
        setAssistantResponse(applyUrgencyRules(rawPlan, profile, liveAqi));
      } catch (err: unknown) {
        const appErr = toAppError(err, ErrorCode.UNKNOWN_ERROR, ERROR_MESSAGES.AI_REQUEST_FAILED);
        if (appErr.code === ErrorCode.AQI_FETCH_ERROR || appErr.code === ErrorCode.CITY_NOT_FOUND) {
          setIsAqiUnavailable(true);
        }
        setError(appErr);
      } finally {
        setIsLoading(false);
      }
    },
    [startCooldown],
  );

  const generatePlan = useCallback(
    async (profile: UserProfile): Promise<void> => {
      if (cooldownSeconds > 0 || isLoading) return;
      await executeLivePlan(profile);
    },
    [cooldownSeconds, executeLivePlan, isLoading],
  );

  const generatePlanWithManualAqi = useCallback(
    async (profile: UserProfile, aqi: number, pm25?: number): Promise<void> => {
      if (isLoading) return;
      lastProfileRef.current = profile;
      setIsLoading(true);
      setError(null);
      startCooldown();

      try {
        const manualAqi = createManualAQIData(profile.city, aqi, pm25);
        setIsAqiUnavailable(false);
        setAqiData(manualAqi);
        const rawPlan = await getAirQualityRecommendations(profile, manualAqi);
        setAssistantResponse(applyUrgencyRules(rawPlan, profile, manualAqi));
      } catch (err: unknown) {
        setError(toAppError(err, ErrorCode.VALIDATION_ERROR, ERROR_MESSAGES.INVALID_MANUAL_AQI));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, startCooldown],
  );

  const retryLastRequest = useCallback(async (): Promise<void> => {
    if (!lastProfileRef.current || isLoading) return;
    resetCooldown();
    await executeLivePlan(lastProfileRef.current);
  }, [executeLivePlan, isLoading, resetCooldown]);

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
