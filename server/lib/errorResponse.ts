/**
 * @module server/errorResponse
 * Responsibility: Send standardized JSON error responses, log diagnostics to stderr, and map Gemini errors.
 * Must not expose raw stack traces or provider secrets to HTTP clients.
 */
import type { Response } from 'express';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../shared/constants/http.ts';
import type { ErrorCode } from '../../shared/types/index.ts';
import {
  GeminiBusyError,
  getUpstreamStatus,
  isModelUnavailableError,
} from '../providers/geminiErrors.ts';
import { logger } from './logger.ts';

function isTimeoutCondition(
  error: unknown,
  status: number | undefined,
  lowerMessage: string,
): boolean {
  return (
    isTimeoutError(error) ||
    status === HTTP_STATUS.REQUEST_TIMEOUT ||
    status === HTTP_STATUS.GATEWAY_TIMEOUT ||
    lowerMessage.includes('timed out') ||
    lowerMessage.includes('timeout')
  );
}

function isAuthCondition(status: number | undefined, rawMessage: string): boolean {
  return (
    status === HTTP_STATUS.FORBIDDEN ||
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('PERMISSION_DENIED')
  );
}

function isQuotaCondition(
  status: number | undefined,
  rawMessage: string,
  lowerMessage: string,
): boolean {
  return (
    status === HTTP_STATUS.TOO_MANY_REQUESTS ||
    rawMessage.includes('RESOURCE_EXHAUSTED') ||
    lowerMessage.includes('quota')
  );
}

/** Sends a standardized typed error JSON payload to the client without leaking internal details. */
export function sendErrorResponse(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
): void {
  res.status(status).json({ code, message });
}

/** Logs upstream or internal error diagnostics via structured logger without secrets. */
export function logServerError(context: string, error: unknown, requestId?: string): void {
  logger.error(`${context} failed`, { requestId, error });
}

/**
 * Checks whether a thrown error represents a cancelled/timed-out upstream request.
 */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

/**
 * Maps known Gemini SDK/HTTP upstream error conditions to safe HTTP status and user messages.
 */
export function mapGeminiUpstreamError(error: unknown): { status: number; message: string } {
  if (error instanceof GeminiBusyError) {
    return { status: HTTP_STATUS.SERVICE_UNAVAILABLE, message: ERROR_MESSAGES.AI_SERVICE_BUSY };
  }
  const status = getUpstreamStatus(error);
  const rawMessage = error instanceof Error ? error.message : '';
  const lowerMessage = rawMessage.toLowerCase();
  if (isTimeoutCondition(error, status, lowerMessage)) {
    return { status: HTTP_STATUS.GATEWAY_TIMEOUT, message: ERROR_MESSAGES.UPSTREAM_TIMEOUT };
  }
  if (isAuthCondition(status, rawMessage)) {
    return { status: HTTP_STATUS.BAD_GATEWAY, message: ERROR_MESSAGES.AI_AUTH_ERROR };
  }
  if (status === HTTP_STATUS.BAD_REQUEST || rawMessage.includes('INVALID_ARGUMENT')) {
    return { status: HTTP_STATUS.BAD_REQUEST, message: ERROR_MESSAGES.INVALID_AI_REQUEST };
  }
  if (isQuotaCondition(status, rawMessage, lowerMessage)) {
    return { status: HTTP_STATUS.TOO_MANY_REQUESTS, message: ERROR_MESSAGES.AI_QUOTA_EXCEEDED };
  }
  if (status === HTTP_STATUS.SERVICE_UNAVAILABLE) {
    return { status: HTTP_STATUS.SERVICE_UNAVAILABLE, message: ERROR_MESSAGES.AI_SERVICE_BUSY };
  }
  if (isModelUnavailableError(error)) {
    return { status: HTTP_STATUS.BAD_GATEWAY, message: ERROR_MESSAGES.AI_MODEL_NOT_FOUND };
  }
  return { status: HTTP_STATUS.BAD_GATEWAY, message: ERROR_MESSAGES.AI_REQUEST_FAILED };
}
