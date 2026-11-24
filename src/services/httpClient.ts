/**
 * @module services/httpClient
 * Responsibility: Execute fetch requests, normalize network/server errors, and validate JSON shapes.
 * Must not hold React state, access Express internals, or swallow AbortError cancellations.
 */
import { ERROR_MESSAGES, HTTP_STATUS } from '../constants/http.ts';
import { INPUT_LIMITS } from '../constants/limits.ts';
import { type AppError, ErrorCode } from '../types/index.ts';
import { createAppError, isAppError } from '../utils/errors.ts';
import { sanitizeText } from '../utils/sanitizing.ts';
import { isRecord } from '../utils/typeGuards.ts';

/**
 * Checks whether an unknown thrown value represents a cancelled fetch AbortError.
 */
export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof DOMException !== 'undefined' &&
      error instanceof DOMException &&
      error.name === 'AbortError')
  );
}

function mapStatusFallbackMessage(
  status: number,
  fallbackCode: ErrorCode,
  fallbackMessage: string,
): string {
  if (status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return fallbackCode === ErrorCode.AI_SERVICE_ERROR
      ? ERROR_MESSAGES.AI_QUOTA_EXCEEDED
      : ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
  }
  if (status === HTTP_STATUS.REQUEST_TIMEOUT || status === HTTP_STATUS.GATEWAY_TIMEOUT) {
    return ERROR_MESSAGES.UPSTREAM_TIMEOUT;
  }
  if (status === HTTP_STATUS.BAD_REQUEST) {
    return fallbackCode === ErrorCode.AI_SERVICE_ERROR
      ? ERROR_MESSAGES.INVALID_AI_REQUEST
      : ERROR_MESSAGES.INVALID_REQUEST_BODY;
  }
  return fallbackMessage;
}

function resolveHttpError(
  status: number,
  errorPayload: unknown,
  fallbackCode: ErrorCode,
  fallbackMessage: string,
): AppError {
  if (isAppError(errorPayload)) {
    const cleanMessage = sanitizeText(errorPayload.message, INPUT_LIMITS.MAX_TEXT_LENGTH);
    if (cleanMessage.length > 0) {
      return createAppError(errorPayload.code, cleanMessage, errorPayload.details);
    }
  }
  if (isRecord(errorPayload) && typeof errorPayload.message === 'string') {
    const cleanMessage = sanitizeText(errorPayload.message, INPUT_LIMITS.MAX_TEXT_LENGTH);
    if (cleanMessage.length > 0) {
      return createAppError(fallbackCode, cleanMessage);
    }
  }
  return createAppError(
    fallbackCode,
    mapStatusFallbackMessage(status, fallbackCode, fallbackMessage),
  );
}

/**
 * Fetches JSON from a client API endpoint, mapping fetch TypeErrors to NETWORK_ERROR,
 * rethrowing AbortError unmodified, propagating server AppErrors, and validating the payload.
 */
export async function fetchJsonOrThrow<T>(
  url: string,
  init: RequestInit | undefined,
  fallbackCode: ErrorCode,
  fallbackMessage: string,
  guard: (raw: unknown) => raw is T,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }
    if (error instanceof TypeError) {
      throw createAppError(ErrorCode.NETWORK_ERROR, ERROR_MESSAGES.NETWORK_ERROR);
    }
    throw createAppError(fallbackCode, fallbackMessage);
  }

  if (!response.ok) {
    const errorPayload: unknown = await response.json().catch(() => null);
    throw resolveHttpError(response.status, errorPayload, fallbackCode, fallbackMessage);
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }
    throw createAppError(fallbackCode, fallbackMessage);
  }

  if (!guard(raw)) {
    throw createAppError(fallbackCode, fallbackMessage);
  }

  return raw;
}
