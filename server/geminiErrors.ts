/**
 * @module server/geminiErrors
 * Responsibility: Classify upstream Gemini errors into model-unavailability, transient busy, and timeout categories.
 * Must not format HTTP responses, call Express methods, or read API keys.
 */
import { ERROR_MESSAGES, HTTP_STATUS } from '../src/constants/http.ts';
import { isRecord } from '../src/utils/typeGuards.ts';

/**
 * Sentinel error thrown when every model in GEMINI_MODEL_CHAIN fails with 503 or 429.
 */
export class GeminiBusyError extends Error {
  constructor() {
    super(ERROR_MESSAGES.AI_SERVICE_BUSY);
    this.name = 'GeminiBusyError';
  }
}

/**
 * Extracts an HTTP status code from an unknown upstream SDK error object if present.
 */
export function getUpstreamStatus(error: unknown): number | undefined {
  return isRecord(error) && typeof error.status === 'number' ? error.status : undefined;
}

/**
 * Checks whether an upstream Gemini error indicates a missing or unsupported model (404 / NOT_FOUND).
 */
export function isModelUnavailableError(error: unknown): boolean {
  const status = getUpstreamStatus(error);
  if (status === HTTP_STATUS.NOT_FOUND) return true;
  if (status !== undefined) return false;
  const code = isRecord(error) && typeof error.code === 'string' ? error.code : '';
  if (code === 'NOT_FOUND') return true;
  const rawMessage = error instanceof Error ? error.message : '';
  const lowerMessage = rawMessage.toLowerCase();
  return (
    rawMessage.includes('NOT_FOUND') ||
    (lowerMessage.includes('model') &&
      (lowerMessage.includes('not found') ||
        lowerMessage.includes('unavailable') ||
        lowerMessage.includes('not supported')))
  );
}

/**
 * Checks whether an upstream Gemini error is a transient overload or rate-limit condition (503 or 429).
 */
export function isTransientBusyError(error: unknown): boolean {
  const status = getUpstreamStatus(error);
  if (status === HTTP_STATUS.SERVICE_UNAVAILABLE || status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return true;
  }
  if (status !== undefined || isModelUnavailableError(error)) return false;
  const code = isRecord(error) && typeof error.code === 'string' ? error.code : '';
  if (code === 'UNAVAILABLE' || code === 'RESOURCE_EXHAUSTED') return true;
  const rawMessage = error instanceof Error ? error.message : '';
  return (
    rawMessage.includes('UNAVAILABLE') ||
    rawMessage.includes('RESOURCE_EXHAUSTED') ||
    rawMessage.toLowerCase().includes('overloaded')
  );
}
