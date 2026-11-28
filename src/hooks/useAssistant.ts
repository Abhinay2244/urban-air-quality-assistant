/**
 * @module hooks/useAssistant
 * Responsibility: Orchestrate AQI lookups, AI recommendations, request cancellation, and cooldown notices.
 * Must not render UI components, manipulate the DOM directly, or bypass service validation.
 */
import { useCallback, useState } from 'react';
import type { AppError, AqiData, AssistantResponse, UserProfile } from '@shared/types/index.ts';
import type { Coordinates } from '@shared/types/planner.ts';
import {
  formatCooldownNotice,
  type LastAssistantRequest,
  type UseAssistantResult,
} from './assistantRunner.ts';
import { useAssistantExecution } from './useAssistantExecution.ts';
import { useCooldown } from './useCooldown.ts';

export type { UseAssistantResult };

function useAssistantActions(params: {
  isLoading: boolean;
  cooldownSeconds: number;
  setShowCooldownNotice: (show: boolean) => void;
  runRequest: (req: LastAssistantRequest) => Promise<void>;
}): {
  requestRecommendations: (profile: UserProfile, coordinates?: Coordinates) => Promise<void>;
  requestRecommendationsWithManualAqi: (
    profile: UserProfile,
    aqi: number,
    pm25?: number,
    pm10?: number,
  ) => Promise<void>;
} {
  const { isLoading, cooldownSeconds, setShowCooldownNotice, runRequest } = params;

  const dispatchWithCooldown = useCallback(
    async (req: LastAssistantRequest): Promise<void> => {
      if (!isLoading && cooldownSeconds > 0) {
        setShowCooldownNotice(true);
        return;
      }
      await runRequest(req);
    },
    [cooldownSeconds, isLoading, runRequest, setShowCooldownNotice],
  );

  const requestRecommendations = useCallback(
    (profile: UserProfile, coordinates?: Coordinates): Promise<void> =>
      dispatchWithCooldown({
        mode: 'live',
        profile,
        ...(coordinates !== undefined ? { coordinates } : {}),
      }),
    [dispatchWithCooldown],
  );

  const requestRecommendationsWithManualAqi = useCallback(
    (profile: UserProfile, aqi: number, pm25?: number, pm10?: number): Promise<void> =>
      runRequest({
        mode: 'manual',
        profile,
        aqi,
        ...(pm25 !== undefined ? { pm25 } : {}),
        ...(pm10 !== undefined ? { pm10 } : {}),
      }),
    [runRequest],
  );

  return { requestRecommendations, requestRecommendationsWithManualAqi };
}

/** Orchestrates live/manual AQI lookup, cancellation, retry, and cooldown notices. */
export function useAssistant(): UseAssistantResult {
  const [aqiData, setAqiData] = useState<AqiData | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAqiUnavailable, setIsAqiUnavailable] = useState<boolean>(false);
  const [showCooldownNotice, setShowCooldownNotice] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const { cooldownSeconds, startCooldown, resetCooldown } = useCooldown();

  const { runRequest, retryLastRequest } = useAssistantExecution({
    setAqiData,
    setAssistantResponse,
    setIsLoading,
    setIsAqiUnavailable,
    setShowCooldownNotice,
    setError,
    startCooldown,
    resetCooldown,
  });
  const { requestRecommendations, requestRecommendationsWithManualAqi } = useAssistantActions({
    isLoading,
    cooldownSeconds,
    setShowCooldownNotice,
    runRequest,
  });

  const cooldownNotice =
    !isLoading && cooldownSeconds > 0 && showCooldownNotice
      ? formatCooldownNotice(cooldownSeconds)
      : null;

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const enableManualAqi = useCallback((): void => {
    setIsAqiUnavailable(true);
    setError(null);
  }, []);

  return {
    aqiData,
    assistantResponse,
    isLoading,
    isAqiUnavailable,
    cooldownSeconds,
    cooldownNotice,
    error,
    requestRecommendations,
    requestRecommendationsWithManualAqi,
    enableManualAqi,
    retryLastRequest,
    clearError,
  };
}
