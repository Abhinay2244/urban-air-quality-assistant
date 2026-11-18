import { type AppError, ErrorCode } from '../types/index.ts';
import { isRecord } from './typeGuards.ts';

const VALID_ERROR_CODES: readonly string[] = Object.values(ErrorCode);

function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && VALID_ERROR_CODES.includes(value);
}

/**
 * Creates a typed, user-friendly application error object.
 */
export function createAppError(code: ErrorCode, message: string, details?: string): AppError {
  return details ? { code, message, details } : { code, message };
}

/**
 * Type guard checking whether an unknown value conforms to AppError.
 */
export function isAppError(value: unknown): value is AppError {
  if (!isRecord(value)) {
    return false;
  }

  return isErrorCode(value.code) && typeof value.message === 'string';
}

/**
 * Converts an unknown thrown value into a typed AppError without leaking internals.
 */
export function toAppError(
  error: unknown,
  fallbackCode: ErrorCode,
  fallbackMessage: string,
): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return createAppError(fallbackCode, fallbackMessage, error.message);
  }

  return createAppError(fallbackCode, fallbackMessage);
}
