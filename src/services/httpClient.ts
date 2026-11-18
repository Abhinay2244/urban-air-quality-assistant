import { ERROR_MESSAGES } from '../constants/limits.ts';
import { ErrorCode } from '../types/index.ts';
import { createAppError, isAppError } from '../utils/errors.ts';

/**
 * Fetches JSON from a client API endpoint, mapping fetch TypeErrors to NETWORK_ERROR,
 * propagating server AppErrors, and validating the parsed payload via a runtime type guard.
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

  const raw: unknown = await response.json();
  if (!guard(raw)) {
    throw createAppError(fallbackCode, fallbackMessage);
  }

  return raw;
}
