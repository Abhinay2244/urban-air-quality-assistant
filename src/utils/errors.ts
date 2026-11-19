/**
 * @module utils/errors
 * Responsibility: Construct, guard, and normalize typed AppError objects without exposing raw internals.
 * Must not perform logging, HTTP responses, or UI rendering.
 */
import { type AppError, ErrorCode } from '../types/index.ts';
import { isOneOf, isRecord } from './typeGuards.ts';

const VALID_ERROR_CODES: readonly ErrorCode[] = Object.values(ErrorCode);

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

  return isOneOf(value.code, VALID_ERROR_CODES) && typeof value.message === 'string';
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

  return createAppError(fallbackCode, fallbackMessage);
}
