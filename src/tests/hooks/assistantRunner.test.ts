import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PROFILE } from '@shared/constants/config.ts';
import { ERROR_MESSAGES } from '@shared/constants/http.ts';
import { executeAssistantRequest, formatCooldownNotice } from '../../hooks/assistantRunner.ts';
import { useAssistant } from '../../hooks/useAssistant.ts';
import { ErrorCode } from '@shared/types/index.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('assistantRunner and useAssistant edge branches', () => {
  it('formats singular and plural cooldown notices accurately', () => {
    expect(formatCooldownNotice(1)).toBe('Please wait 1 second');
    expect(formatCooldownNotice(5)).toBe('Please wait 5 seconds');
  });

  it('returns validation error on invalid manual AQI and handles Gemini request failure', async () => {
    const controller = new AbortController();
    const invalidManual = await executeAssistantRequest(
      { mode: 'manual', profile: DEFAULT_USER_PROFILE, aqi: 999 },
      controller.signal,
      vi.fn(),
    );
    expect(invalidManual.markAqiUnavailable).toBe(true);
    expect(invalidManual.error?.code).toBe(ErrorCode.VALIDATION_ERROR);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('network down')));
    const geminiFailure = await executeAssistantRequest(
      { mode: 'manual', profile: DEFAULT_USER_PROFILE, aqi: 180 },
      controller.signal,
      vi.fn(),
    );
    expect(geminiFailure.markAqiUnavailable).toBe(true);
    expect(geminiFailure.error?.message).toBe(ERROR_MESSAGES.NETWORK_ERROR);
  });

  it('enables manual AQI override directly via enableManualAqi', () => {
    const { result } = renderHook(() => useAssistant());
    expect(result.current.isAqiUnavailable).toBe(false);
    act(() => {
      result.current.enableManualAqi();
    });
    expect(result.current.isAqiUnavailable).toBe(true);
    expect(result.current.error).toBeNull();
  });
});
