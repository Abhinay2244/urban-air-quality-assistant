/**
 * @module server/geminiTransport
 * Responsibility: Invoke @google/genai with thinking config, maxOutputTokens, per-attempt timeout, and retry backoff.
 * Must not hold Express request/response objects, select models, or read environment keys.
 */
import { type GoogleGenAI, ThinkingLevel } from '@google/genai';
import { ASSISTANT_SYSTEM_INSTRUCTION } from '../src/constants/prompts.ts';
import { GEMINI_CONFIG } from '../src/constants/server.ts';
import { ASSISTANT_RESPONSE_SCHEMA } from './geminiSchema.ts';

/**
 * Lowest broadly supported Gemini thinking level used across all chain models to minimize latency.
 */
const GEMINI_THINKING_LEVEL = ThinkingLevel.LOW;

/**
 * Timing parameters governing retry backoff, per-attempt timeout, and total request budget.
 */
export interface GeminiChainTimings {
  retryDelayMs: number;
  perAttemptTimeoutMs: number;
  totalTimeoutMs: number;
}

/**
 * Default retry delay, per-attempt timeout, and total budget timings derived from GEMINI_CONFIG.
 */
export const DEFAULT_GEMINI_TIMINGS: GeminiChainTimings = {
  retryDelayMs: GEMINI_CONFIG.RETRY_DELAY_MS,
  perAttemptTimeoutMs: GEMINI_CONFIG.PER_ATTEMPT_TIMEOUT_MS,
  totalTimeoutMs: GEMINI_CONFIG.TOTAL_TIMEOUT_MS,
};

/**
 * Creates a standardized TimeoutError used when a per-attempt or total Gemini timeout expires.
 */
export function createTimeoutError(): Error {
  const err = new Error('Gemini request timed out');
  err.name = 'TimeoutError';
  return err;
}

/**
 * Waits for the retry backoff delay unless the shared total-timeout signal aborts early.
 */
export function waitForRetry(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.reject(createTimeoutError());
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(createTimeoutError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Executes a single structured-JSON Gemini call bounded by both per-attempt timeout and total budget signal.
 */
export async function invokeGeminiModel(
  ai: GoogleGenAI,
  model: string,
  contents: string,
  perAttemptTimeoutMs: number,
  totalSignal: AbortSignal,
): Promise<string> {
  if (totalSignal.aborted) throw createTimeoutError();
  const attemptController = new AbortController();
  const onTotalAbort = (): void => attemptController.abort(createTimeoutError());
  totalSignal.addEventListener('abort', onTotalAbort, { once: true });
  const attemptTimer = setTimeout(
    () => attemptController.abort(createTimeoutError()),
    perAttemptTimeoutMs,
  );

  let onAttemptAbort: (() => void) | undefined;
  const abortPromise = new Promise<never>((_resolve, reject) => {
    onAttemptAbort = (): void => reject(createTimeoutError());
    attemptController.signal.addEventListener('abort', onAttemptAbort, { once: true });
  });

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
          responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
          responseSchema: ASSISTANT_RESPONSE_SCHEMA,
          maxOutputTokens: GEMINI_CONFIG.MAX_OUTPUT_TOKENS,
          thinkingConfig: { thinkingLevel: GEMINI_THINKING_LEVEL },
          abortSignal: attemptController.signal,
        },
      }),
      abortPromise,
    ]);
    return response.text ?? '';
  } finally {
    clearTimeout(attemptTimer);
    totalSignal.removeEventListener('abort', onTotalAbort);
    if (onAttemptAbort) attemptController.signal.removeEventListener('abort', onAttemptAbort);
  }
}
