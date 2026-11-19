/**
 * @module services/httpClient
 * Responsibility: Execute fetch requests, normalize network/server errors, and validate JSON shapes.
 * Must not hold React state, access Express internals, or swallow AbortError cancellations.
 */
import { ERROR_MESSAGES } from '../constants/http.ts';
import { ErrorCode } from '../types/index.ts';
import { createAppError, isAppError } from '../utils/errors.ts';

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
    if (isAppError(errorPayload)) {
      throw errorPayload;
    }
    throw createAppError(fallbackCode, fallbackMessage);
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
