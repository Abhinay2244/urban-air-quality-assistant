import { useCallback, useState } from 'react';
import { ERROR_MESSAGES } from '../constants/config.ts';
import { fetchAQIDataByCity } from '../services/aqiService.ts';
import { getAirQualityRecommendations } from '../services/geminiService.ts';
import {
  type AppError,
  type AQIData,
  type AssistantResponse,
  ErrorCode,
  type UserProfile,
} from '../types/index.ts';
import { toAppError } from '../utils/errors.ts';

/**
 * Return value of the useAssistant custom hook.
 */
export interface UseAssistantResult {
  aqiData: AQIData | null;
  assistantResponse: AssistantResponse | null;
  isLoading: boolean;
  error: AppError | null;
  generatePlan: (profile: UserProfile) => Promise<void>;
  clearError: () => void;
}

/**
 * Orchestrates live AQI fetching and GenAI recommendation generation for a user profile.
 */
export function useAssistant(): UseAssistantResult {
  const [aqiData, setAqiData] = useState<AQIData | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const generatePlan = useCallback(async (profile: UserProfile): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const liveAqi = await fetchAQIDataByCity(profile.city);
      setAqiData(liveAqi);

      const recommendations = await getAirQualityRecommendations(profile, liveAqi);
      setAssistantResponse(recommendations);
    } catch (err: unknown) {
      setError(toAppError(err, ErrorCode.UNKNOWN_ERROR, ERROR_MESSAGES.AI_REQUEST_FAILED));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    aqiData,
    assistantResponse,
    isLoading,
    error,
    generatePlan,
    clearError,
  };
}
