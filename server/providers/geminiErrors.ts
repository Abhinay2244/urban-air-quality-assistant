/**
 * @module server/geminiErrors
 * Responsibility: Classify upstream Gemini errors into model-unavailability, transient busy, and timeout categories.
 * Must not format HTTP responses, call Express methods, or read API keys.
 */
import { ERROR_MESSAGES, HTTP_STATUS } from '../../shared/constants/http.ts';
import { isRecord } from '../../shared/utils/typeGuards.ts';

function readErrorCode(error: unknown): string {
  return isRecord(error) && typeof error.code === 'string' ? error.code : '';
}

function hasUnavailableModelMessage(error: unknown): boolean {
  const rawMessage = error instanceof Error ? error.message : '';
  if (rawMessage.includes('NOT_FOUND')) return true;
  const lower = rawMessage.toLowerCase();
  return (
    lower.includes('model') &&
    (lower.includes('not found') ||
      lower.includes('unavailable') ||
      lower.includes('not supported'))
  );
}

function hasTransientBusyMessage(error: unknown): boolean {
  const rawMessage = error instanceof Error ? error.message : '';
  return (
    rawMessage.includes('UNAVAILABLE') ||
    rawMessage.includes('RESOURCE_EXHAUSTED') ||
    rawMessage.toLowerCase().includes('overloaded')
  );
}

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
  return readErrorCode(error) === 'NOT_FOUND' || hasUnavailableModelMessage(error);
}

/**
 * Checks whether an upstream Gemini error is a transient overload or rate-limit condition (503 or 429).
 */
function isTransientBusyError(error: unknown): boolean {
  const status = getUpstreamStatus(error);
  if (status === HTTP_STATUS.SERVICE_UNAVAILABLE || status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return true;
  }
  if (status !== undefined || isModelUnavailableError(error)) return false;
  const code = readErrorCode(error);
  return code === 'UNAVAILABLE' || code === 'RESOURCE_EXHAUSTED' || hasTransientBusyMessage(error);
}

/**
 * Classifies an error caught during model chain execution into skip (next model),
 * busy (retry once after delay), or immediate rethrow.
 */
export function classifyGeminiChainError(
  error: unknown,
  totalAborted: boolean,
  createTimeoutError: () => Error,
  isTimeoutError: (err: unknown) => boolean,
): 'skip' | 'busy' {
  if (totalAborted) throw createTimeoutError();
  if (isTimeoutError(error) || isModelUnavailableError(error)) return 'skip';
  if (isTransientBusyError(error)) return 'busy';
  throw error;
}
