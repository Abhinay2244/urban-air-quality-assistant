/**
 * @module utils/errors
 * Responsibility: Construct, guard, and normalize typed AppError objects without exposing raw internals.
 * Must not perform logging, HTTP responses, or UI rendering.
 */
import { type AppError, ErrorCode } from '../types/index.ts';
import { isOneOf, isRecord } from './typeGuards.ts';

const VALID_ERROR_CODES: readonly ErrorCode[] = Object.values(ErrorCode);

class CodedAppError extends Error implements AppError {
  readonly code: ErrorCode;
  readonly details?: string;

  constructor(code: ErrorCode, message: string, details?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

/**
 * Creates a typed, Error-derived application error object safe for throwing and UI display.
 */
export function createAppError(
  code: ErrorCode,
  message: string,
  details?: string,
): Error & AppError {
  return new CodedAppError(code, message, details);
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
): Error & AppError {
  if (error instanceof Error && isAppError(error)) {
    return error;
  }
  if (isAppError(error)) {
    return createAppError(error.code, error.message, error.details);
  }

  return createAppError(fallbackCode, fallbackMessage);
}
