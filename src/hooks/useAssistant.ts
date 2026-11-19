/**
 * @module hooks/useAssistant
 * Responsibility: Orchestrate AQI lookups, AI recommendations, request cancellation, and cooldown notices.
 * Must not render UI components, manipulate the DOM directly, or bypass service validation.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError } from '../services/httpClient.ts';
import type { AppError, AqiData, AssistantResponse, UserProfile } from '../types/index.ts';
import {
  executeAssistantRequest,
  formatCooldownNotice,
  type LastAssistantRequest,
} from './assistantRunner.ts';
import { useCooldown } from './useCooldown.ts';

/** Return value of the useAssistant custom hook. */
export interface UseAssistantResult {
  aqiData: AqiData | null;
  assistantResponse: AssistantResponse | null;
  isLoading: boolean;
  isAqiUnavailable: boolean;
  cooldownSeconds: number;
  cooldownNotice: string | null;
  error: AppError | null;
  requestRecommendations: (profile: UserProfile) => Promise<void>;
  requestRecommendationsWithManualAqi: (
    profile: UserProfile,
    aqi: number,
    pm25?: number,
  ) => Promise<void>;
  enableManualAqi: () => void;
  retryLastRequest: () => Promise<void>;
  clearError: () => void;
}

/**
 * Orchestrates live/manual AQI lookup, GenAI recommendations, rule-based urgency,
 * request cancellation, mode-preserving retry, and visible submit cooldown feedback.
 */
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

  const requestRecommendations = useCallback(
    async (profile: UserProfile): Promise<void> => {
      if (!isLoading && cooldownSeconds > 0) {
        setShowCooldownNotice(true);
        return;
      }
      await runRequest({ mode: 'live', profile });
    },
    [cooldownSeconds, isLoading, runRequest],
  );

  const requestRecommendationsWithManualAqi = useCallback(
    async (profile: UserProfile, aqi: number, pm25?: number): Promise<void> => {
      await runRequest({ mode: 'manual', profile, aqi, pm25 });
    },
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
    requestRecommendationsWithManualAqi,
    enableManualAqi,
    retryLastRequest,
    clearError,
  };
}
