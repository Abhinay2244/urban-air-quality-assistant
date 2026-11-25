/**
 * @module server/geminiTransport
 * Responsibility: Invoke @google/genai with abort-signal racing and cancellable retry delays.
 * Must not hold Express request/response objects, select models, or read environment keys.
 */
import type { GoogleGenAI } from '@google/genai';
import { ASSISTANT_SYSTEM_INSTRUCTION } from '../src/constants/prompts.ts';
import { GEMINI_CONFIG } from '../src/constants/server.ts';
import { ASSISTANT_RESPONSE_SCHEMA } from './geminiSchema.ts';

/**
 * Creates a standardized TimeoutError used when the overall Gemini request cap expires.
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
 * Executes a single structured-JSON Gemini call under the shared total-timeout AbortSignal.
 */
export async function invokeGeminiModel(
  ai: GoogleGenAI,
  model: string,
  contents: string,
  abortSignal: AbortSignal,
): Promise<string> {
  let onAbort: (() => void) | undefined;
  const abortPromise = new Promise<never>((_resolve, reject) => {
    if (abortSignal.aborted) {
      reject(createTimeoutError());
      return;
    }
    onAbort = (): void => reject(createTimeoutError());
    abortSignal.addEventListener('abort', onAbort, { once: true });
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
          abortSignal,
        },
      }),
      abortPromise,
    ]);
    return response.text ?? '';
  } finally {
    if (onAbort) abortSignal.removeEventListener('abort', onAbort);
  }
}
