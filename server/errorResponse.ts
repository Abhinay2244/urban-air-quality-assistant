/**
 * @module server/errorResponse
 * Responsibility: Send standardized JSON error responses, log diagnostics to stderr, and map Gemini errors.
 * Must not expose raw stack traces or provider secrets to HTTP clients.
 */
import type { Response } from 'express';
import { ERROR_MESSAGES, HTTP_STATUS } from '../src/constants/http.ts';
import type { ErrorCode } from '../src/types/index.ts';
import { isRecord } from '../src/utils/typeGuards.ts';
import { GeminiBusyError, getUpstreamStatus, isModelUnavailableError } from './geminiErrors.ts';

/**
 * Sends a standardized typed error JSON payload to the client without leaking internal details.
 */
export function sendErrorResponse(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
): void {
  res.status(status).json({ code, message });
}

/**
 * Writes upstream or internal error diagnostics to server stderr logs only.
 */
export function logServerError(context: string, error: unknown): void {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  process.stderr.write(`[${context}] ${detail}\n`);
}

/**
 * Logs Gemini upstream error status and error type to stderr without exposing API keys or request bodies.
 */
export function logGeminiUpstreamError(context: string, model: string, error: unknown): void {
  const status =
    isRecord(error) && typeof error.status === 'number' ? String(error.status) : 'unknown';
  const errorType =
    error instanceof Error
      ? error.name
      : isRecord(error) && typeof error.name === 'string'
        ? error.name
        : typeof error;
  process.stderr.write(`[${context}] model=${model} status=${status} type=${errorType}\n`);
}

/**
 * Logs which Gemini model succeeded server-side without exposing keys or request payloads.
 */
export function logGeminiModelSuccess(model: string): void {
  process.stderr.write(`[Gemini Success] model=${model}\n`);
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
  if (
    isTimeoutError(error) ||
    status === HTTP_STATUS.REQUEST_TIMEOUT ||
    status === HTTP_STATUS.GATEWAY_TIMEOUT ||
    lowerMessage.includes('timed out') ||
    lowerMessage.includes('timeout')
  ) {
    return { status: HTTP_STATUS.GATEWAY_TIMEOUT, message: ERROR_MESSAGES.UPSTREAM_TIMEOUT };
  }
  if (
    status === HTTP_STATUS.FORBIDDEN ||
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('PERMISSION_DENIED')
  ) {
    return { status: HTTP_STATUS.BAD_GATEWAY, message: ERROR_MESSAGES.AI_AUTH_ERROR };
  }
  if (status === HTTP_STATUS.BAD_REQUEST || rawMessage.includes('INVALID_ARGUMENT')) {
    return { status: HTTP_STATUS.BAD_REQUEST, message: ERROR_MESSAGES.INVALID_AI_REQUEST };
  }
  if (
    status === HTTP_STATUS.TOO_MANY_REQUESTS ||
    rawMessage.includes('RESOURCE_EXHAUSTED') ||
    lowerMessage.includes('quota')
  ) {
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
