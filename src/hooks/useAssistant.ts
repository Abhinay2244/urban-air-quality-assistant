/**
 * @module hooks/useAssistant
 * Responsibility: Orchestrate AQI lookups, AI recommendations, request cancellation, and cooldown notices.
 * Must not render UI components, manipulate the DOM directly, or bypass service validation.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError } from '../services/httpClient.ts';
import type { AppError, AqiData, AssistantResponse, UserProfile } from '../types/index.ts';
import type { Coordinates } from '../types/planner.ts';
import {
  executeAssistantRequest,
  formatCooldownNotice,
  type LastAssistantRequest,
  type UseAssistantResult,
} from './assistantRunner.ts';
import { useCooldown } from './useCooldown.ts';

export type { UseAssistantResult };

/** Orchestrates live/coordinate/manual AQI lookup, cancellation, retry, and cooldown notices. */
export function useAssistant(): UseAssistantResult {
  const [aqiData, setAqiData] = useState<AqiData | null>(null);
  const [assistantResponse, setAssistantResponse] = useState<AssistantResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAqiUnavailable, setIsAqiUnavailable] = useState<boolean>(false);
  const [showCooldownNotice, setShowCooldownNotice] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const lastRequestRef = useRef<LastAssistantRequest | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { cooldownSeconds, startCooldown, resetCooldown } = useCooldown();

  useEffect(() => (): void => abortControllerRef.current?.abort(), []);
  const cooldownNotice =
    !isLoading && cooldownSeconds > 0 && showCooldownNotice
      ? formatCooldownNotice(cooldownSeconds)
      : null;

  const clearError = useCallback((): void => setError(null), []);
  const enableManualAqi = useCallback((): void => {
    setIsAqiUnavailable(true);
    setError(null);
  }, []);

  const runRequest = useCallback(
    async (req: LastAssistantRequest): Promise<void> => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      lastRequestRef.current = req;
      setIsLoading(true);
      setShowCooldownNotice(false);
      setError(null);
      if (req.mode === 'live') setIsAqiUnavailable(false);

      try {
        const result = await executeAssistantRequest(req, controller.signal, (resolved) => {
          if (!controller.signal.aborted && abortControllerRef.current === controller) {
            setAqiData(resolved);
          }
        });
        if (controller.signal.aborted || abortControllerRef.current !== controller) return;
        if (result.markAqiUnavailable) setIsAqiUnavailable(true);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.response) {
          setIsAqiUnavailable(false);
          setAssistantResponse(result.response);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted || isAbortError(err)) return;
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsLoading(false);
          if (!controller.signal.aborted) startCooldown();
        }
      }
    },
    [startCooldown],
  );

  const dispatchWithCooldown = useCallback(
    async (req: LastAssistantRequest): Promise<void> => {
      if (!isLoading && cooldownSeconds > 0) {
        setShowCooldownNotice(true);
        return;
      }
      await runRequest(req);
    },
    [cooldownSeconds, isLoading, runRequest],
  );

  const requestRecommendations = useCallback(
    (profile: UserProfile, coordinates?: Coordinates): Promise<void> =>
      dispatchWithCooldown({ mode: 'live', profile, coordinates }),
    [dispatchWithCooldown],
  );

  const requestRecommendationsByLocation = useCallback(
    (profile: UserProfile, coordinates: Coordinates): Promise<void> =>
      dispatchWithCooldown({ mode: 'live', profile, coordinates, useCoordinatesOnly: true }),
    [dispatchWithCooldown],
  );

  const requestRecommendationsWithManualAqi = useCallback(
    (profile: UserProfile, aqi: number, pm25?: number, pm10?: number): Promise<void> =>
      runRequest({ mode: 'manual', profile, aqi, pm25, pm10 }),
    [runRequest],
  );

  const retryLastRequest = useCallback(async (): Promise<void> => {
    if (!lastRequestRef.current) return;
    resetCooldown();
    await runRequest(lastRequestRef.current);
  }, [resetCooldown, runRequest]);

  return {
    aqiData,
    assistantResponse,
    isLoading,
    isAqiUnavailable,
    cooldownSeconds,
    cooldownNotice,
    error,
    requestRecommendations,
    requestRecommendationsByLocation,
    requestRecommendationsWithManualAqi,
    enableManualAqi,
    retryLastRequest,
    clearError,
  };
}
