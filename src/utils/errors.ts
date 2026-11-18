import { type AppError, ErrorCode } from '../types/index.ts';

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
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.code === 'string' &&
    Object.values(ErrorCode).includes(candidate.code as ErrorCode) &&
    typeof candidate.message === 'string'
  );
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
