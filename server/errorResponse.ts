/**
 * @module server/errorResponse
 * Responsibility: Send standardized JSON error responses, log diagnostics to stderr, and map Gemini errors.
 * Must not expose raw stack traces or provider secrets to HTTP clients.
 */
import type { Response } from 'express';
import { ERROR_MESSAGES, HTTP_STATUS } from '../src/constants/http.ts';
import type { ErrorCode } from '../src/types/index.ts';
import { isRecord } from '../src/utils/typeGuards.ts';

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
 * Checks whether a thrown error represents an aborted or timed-out upstream fetch.
 */
export function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

/**
 * Maps known Gemini SDK/HTTP upstream error conditions to safe HTTP status and user messages.
 */
export function mapGeminiUpstreamError(error: unknown): { status: number; message: string } {
  if (isTimeoutError(error)) {
    return { status: HTTP_STATUS.GATEWAY_TIMEOUT, message: ERROR_MESSAGES.UPSTREAM_TIMEOUT };
  }

  const status = isRecord(error) && typeof error.status === 'number' ? error.status : undefined;
  const rawMessage = error instanceof Error ? error.message : '';

  if (
    status === HTTP_STATUS.BAD_REQUEST ||
    status === HTTP_STATUS.FORBIDDEN ||
    rawMessage.includes('API_KEY_INVALID') ||
    rawMessage.includes('PERMISSION_DENIED')
  ) {
    return { status: HTTP_STATUS.BAD_GATEWAY, message: ERROR_MESSAGES.AI_AUTH_ERROR };
  }

  if (status === HTTP_STATUS.TOO_MANY_REQUESTS || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return { status: HTTP_STATUS.TOO_MANY_REQUESTS, message: ERROR_MESSAGES.AI_QUOTA_EXCEEDED };
  }

  if (status === HTTP_STATUS.NOT_FOUND || rawMessage.includes('NOT_FOUND')) {
    return { status: HTTP_STATUS.BAD_GATEWAY, message: ERROR_MESSAGES.AI_MODEL_NOT_FOUND };
  }

  return { status: HTTP_STATUS.BAD_GATEWAY, message: ERROR_MESSAGES.AI_REQUEST_FAILED };
}
