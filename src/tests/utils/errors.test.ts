import { describe, expect, it } from 'vitest';
import { ErrorCode } from '../../types/index.ts';
import { createAppError, isAppError, toAppError } from '../../utils/errors.ts';

describe('error utilities', () => {
  it('validates AppError shapes via isAppError', () => {
    expect(isAppError(createAppError(ErrorCode.NETWORK_ERROR, 'Offline'))).toBe(true);
    expect(isAppError({ code: 'NOT_A_CODE', message: 'Nope' })).toBe(false);
    expect(isAppError({ code: ErrorCode.NETWORK_ERROR, message: 123 })).toBe(false);
    expect(isAppError(null)).toBe(false);
  });

  it('preserves typed AppErrors and omits raw Error.message internals in toAppError', () => {
    const typed = createAppError(ErrorCode.CITY_NOT_FOUND, 'City missing');
    expect(toAppError(typed, ErrorCode.UNKNOWN_ERROR, 'Fallback')).toBe(typed);

    const rawError = new Error('Unexpected token < in JSON at position 0');
    const converted = toAppError(rawError, ErrorCode.AI_SERVICE_ERROR, 'Safe user message');
    expect(converted).toEqual({
      code: ErrorCode.AI_SERVICE_ERROR,
      message: 'Safe user message',
    });
    expect(converted.details).toBeUndefined();
  });
});
