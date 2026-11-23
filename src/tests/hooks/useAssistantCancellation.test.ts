import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAssistant } from '../../hooks/useAssistant.ts';
import type { AqiData } from '../../types/index.ts';
import {
  DEFAULT_PROFILE_FIXTURE,
  MOCK_AQI_FIXTURE,
  MOCK_ASSISTANT_RESPONSE_FIXTURE,
  spyCityAqiLookup,
  spyRecommendationsCall,
} from '../fixtures/assistantFixtures.ts';

describe('useAssistant cancellation and cooldown notice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces visible cooldownNotice when request is ignored during cooldown', async () => {
    spyCityAqiLookup().mockResolvedValueOnce(MOCK_AQI_FIXTURE);
    spyRecommendationsCall().mockResolvedValueOnce(MOCK_ASSISTANT_RESPONSE_FIXTURE);

    const { result } = renderHook(() => useAssistant());
    await act(async () => {
      await result.current.requestRecommendations(DEFAULT_PROFILE_FIXTURE);
    });

    await act(async () => {
      await result.current.requestRecommendations(DEFAULT_PROFILE_FIXTURE);
    });

    expect(result.current.cooldownNotice).toBe(
      `Please wait ${result.current.cooldownSeconds} seconds`,
    );
  });

  it('aborts the first in-flight request when a second request starts', async () => {
    const capturedSignals: Array<AbortSignal | undefined> = [];

    spyCityAqiLookup()
      .mockImplementationOnce(
        (_city, signal) =>
          new Promise<AqiData>((_resolve, reject) => {
            capturedSignals.push(signal);
            signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      )
      .mockImplementationOnce(async (_city, signal) => {
        capturedSignals.push(signal);
        return { ...MOCK_AQI_FIXTURE, city: 'Lahore' };
      });
    spyRecommendationsCall().mockResolvedValueOnce(MOCK_ASSISTANT_RESPONSE_FIXTURE);

    const { result } = renderHook(() => useAssistant());

    let firstPromise: Promise<void> | undefined;
    act(() => {
      firstPromise = result.current.requestRecommendations(DEFAULT_PROFILE_FIXTURE);
    });
    expect(capturedSignals[0]?.aborted).toBe(false);

    await act(async () => {
      await result.current.requestRecommendations({ ...DEFAULT_PROFILE_FIXTURE, city: 'Lahore' });
      await firstPromise;
    });

    expect(capturedSignals[0]?.aborted).toBe(true);
    expect(capturedSignals[1]?.aborted).toBe(false);
    expect(result.current.aqiData?.city).toBe('Lahore');
    expect(result.current.error).toBeNull();
  });

  it('aborts active in-flight request when hook unmounts', () => {
    let capturedSignal: AbortSignal | undefined;
    spyCityAqiLookup().mockImplementationOnce(
      (_city, signal) =>
        new Promise<AqiData>(() => {
          capturedSignal = signal;
        }),
    );

    const { result, unmount } = renderHook(() => useAssistant());
    act(() => {
      void result.current.requestRecommendations(DEFAULT_PROFILE_FIXTURE);
    });

    expect(capturedSignal?.aborted).toBe(false);
    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
