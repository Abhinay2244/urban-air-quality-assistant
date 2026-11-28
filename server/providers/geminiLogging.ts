/**
 * @module server/geminiLogging
 * Responsibility: Emit structured logs for Gemini model success, retries, recoverable deferrals, and terminal failures.
 * Must not format HTTP responses, call Express methods, or expose raw secrets.
 */
import { HTTP_STATUS } from '../../shared/constants/http.ts';
import { isRecord } from '../../shared/utils/typeGuards.ts';
import { isTimeoutError } from '../lib/errorResponse.ts';
import { logger } from '../lib/logger.ts';
import { getUpstreamStatus } from './geminiErrors.ts';

/** Parameters for logging an intermediate or terminal Gemini model attempt outcome. */
export interface GeminiAttemptLogParams {
  context: string;
  model: string;
  error: unknown;
  recoverable: boolean;
  requestId?: string | undefined;
}

function resolveErrorType(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (isRecord(error) && typeof error.name === 'string') return error.name;
  return typeof error;
}

function resolveDeferReason(error: unknown, status: number | undefined): string {
  if (status === HTTP_STATUS.SERVICE_UNAVAILABLE) return 'service_busy';
  if (status === HTTP_STATUS.TOO_MANY_REQUESTS) return 'rate_limited';
  if (status === HTTP_STATUS.NOT_FOUND) return 'model_not_found';
  if (isTimeoutError(error)) return 'timeout';
  return 'upstream_unavailable';
}

/**
 * Logs a recoverable Gemini attempt deferral at info level (stdout) or a terminal
 * exhaustion failure at error level (stderr) without leaking secrets or bodies.
 */
export function logGeminiAttemptOutcome(params: GeminiAttemptLogParams): void {
  const { context, model, error, recoverable, requestId } = params;
  const status = getUpstreamStatus(error);
  if (recoverable) {
    const reason = resolveDeferReason(error, status);
    logger.info(`${context} attempt deferred`, { requestId, model, status, reason });
    return;
  }
  const errorType = resolveErrorType(error);
  logger.error(`${context} request failed`, { requestId, model, status, errorType });
}

/** Logs which Gemini model answered via structured logger with requestId. */
export function logGeminiModelSuccess(model: string, requestId?: string): void {
  logger.info('Gemini model answered', { requestId, model });
}

/** Logs a retry attempt on a transient busy Gemini model with requestId. */
export function logGeminiModelRetry(model: string, delayMs: number, requestId?: string): void {
  logger.info('Retrying Gemini model', { requestId, model, attempt: 2, delayMs });
}

/** Logs falling back from one Gemini model to the next model in the chain with requestId. */
export function logGeminiModelFallback(
  fromModel: string,
  toModel: string,
  reason: 'skip' | 'retry_exhausted',
  requestId?: string,
): void {
  logger.info('Falling back to next Gemini model', { requestId, fromModel, toModel, reason });
}
