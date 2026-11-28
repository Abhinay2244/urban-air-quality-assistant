/**
 * @module hooks/useAssistantExecution
 * Responsibility: Manage AbortController lifecycle and async execution state for assistant requests.
 * Must not render UI components or construct profile payloads.
 */
import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { ERROR_MESSAGES } from '@shared/constants/http.ts';
import {
  type AppError,
  type AqiData,
  type AssistantResponse,
  ErrorCode,
} from '@shared/types/index.ts';
import { toAppError } from '@shared/utils/errors.ts';
import { isAbortError } from '../services/httpClient.ts';
import { executeAssistantRequest, type LastAssistantRequest } from './assistantRunner.ts';

/** Setter and cooldown dependencies required by useAssistantExecution. */
export interface AssistantExecutionDeps {
  setAqiData: (data: AqiData) => void;
  setAssistantResponse: (res: AssistantResponse) => void;
  setIsLoading: (loading: boolean) => void;
  setIsAqiUnavailable: (unavailable: boolean) => void;
  setShowCooldownNotice: (show: boolean) => void;
  setError: (err: AppError | null) => void;
  startCooldown: () => void;
  resetCooldown: () => void;
}

function applyAssistantResult(
  result: Awaited<ReturnType<typeof executeAssistantRequest>>,
  deps: AssistantExecutionDeps,
): void {
  if (result.markAqiUnavailable) {
    deps.setIsAqiUnavailable(true);
  }
  if (result.error) {
    deps.setError(result.error);
    return;
  }
  if (result.response) {
    deps.setError(null);
    deps.setIsAqiUnavailable(false);
    deps.setAssistantResponse(result.response);
  }
}

function isCurrentActive(
  controller: AbortController,
  abortRef: RefObject<AbortController | null>,
): boolean {
  return !controller.signal.aborted && abortRef.current === controller;
}

async function runTrackedRequest(
  req: LastAssistantRequest,
  controller: AbortController,
  abortRef: RefObject<AbortController | null>,
  depsRef: RefObject<AssistantExecutionDeps>,
): Promise<void> {
  try {
    const result = await executeAssistantRequest(req, controller.signal, (resolved) => {
      if (isCurrentActive(controller, abortRef)) {
        depsRef.current.setAqiData(resolved);
      }
    });
    if (isCurrentActive(controller, abortRef)) {
      applyAssistantResult(result, depsRef.current);
    }
  } catch (err: unknown) {
    if (!controller.signal.aborted && !isAbortError(err) && abortRef.current === controller) {
      depsRef.current.setError(
        toAppError(err, ErrorCode.AI_SERVICE_ERROR, ERROR_MESSAGES.AI_REQUEST_FAILED),
      );
    }
  } finally {
    if (abortRef.current === controller) {
      abortRef.current = null;
      depsRef.current.setIsLoading(false);
      if (!controller.signal.aborted) {
        depsRef.current.startCooldown();
      }
    }
  }
}

/** Provides abort-safe request execution and retry callbacks for useAssistant. */
export function useAssistantExecution(deps: AssistantExecutionDeps): {
  runRequest: (req: LastAssistantRequest) => Promise<void>;
  retryLastRequest: () => Promise<void>;
} {
  const lastRequestRef = useRef<LastAssistantRequest | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const depsRef = useRef<AssistantExecutionDeps>(deps);

  useEffect(() => {
    depsRef.current = deps;
  });

  useEffect(
    () => (): void => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const runRequest = useCallback(async (req: LastAssistantRequest): Promise<void> => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastRequestRef.current = req;
    const currentDeps = depsRef.current;
    currentDeps.setIsLoading(true);
    currentDeps.setShowCooldownNotice(false);
    currentDeps.setError(null);
    if (req.mode === 'live') {
      currentDeps.setIsAqiUnavailable(false);
    }
    await runTrackedRequest(req, controller, abortControllerRef, depsRef);
  }, []);

  const retryLastRequest = useCallback(async (): Promise<void> => {
    if (!lastRequestRef.current) {
      return;
    }
    depsRef.current.resetCooldown();
    await runRequest(lastRequestRef.current);
  }, [runRequest]);

  return { runRequest, retryLastRequest };
}
