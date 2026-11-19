import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import { useAssistant } from '../../hooks/useAssistant.ts';
import * as aqiService from '../../services/aqiService.ts';
import * as geminiService from '../../services/geminiService.ts';
import type { AqiData } from '../../types/index.ts';
import {
  MOCK_AQI_FIXTURE,
  MOCK_ASSISTANT_RESPONSE_FIXTURE,
} from '../fixtures/assistantFixtures.ts';

describe('useAssistant cancellation and cooldown notice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces visible cooldownNotice when request is ignored during cooldown', async () => {
    vi.spyOn(aqiService, 'fetchAqiDataByCity').mockResolvedValueOnce(MOCK_AQI_FIXTURE);
    vi.spyOn(geminiService, 'getAirQualityRecommendations').mockResolvedValueOnce(
      MOCK_ASSISTANT_RESPONSE_FIXTURE,
    );

    const { result } = renderHook(() => useAssistant());
    await act(async () => {
      await result.current.requestRecommendations(DEFAULT_USER_PROFILE);
    });

    await act(async () => {
      await result.current.requestRecommendations(DEFAULT_USER_PROFILE);
    });

    expect(result.current.cooldownNotice).toBe(
      `Please wait ${result.current.cooldownSeconds} seconds`,
    );
  });

  it('aborts the first in-flight request when a second request starts', async () => {
    const capturedSignals: Array<AbortSignal | undefined> = [];

    vi.spyOn(aqiService, 'fetchAqiDataByCity')
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
    vi.spyOn(geminiService, 'getAirQualityRecommendations').mockResolvedValueOnce(
      MOCK_ASSISTANT_RESPONSE_FIXTURE,
    );

    const { result } = renderHook(() => useAssistant());

    let firstPromise: Promise<void> | undefined;
    act(() => {
      firstPromise = result.current.requestRecommendations(DEFAULT_USER_PROFILE);
    });
    expect(capturedSignals[0]?.aborted).toBe(false);

    await act(async () => {
      await result.current.requestRecommendations({ ...DEFAULT_USER_PROFILE, city: 'Lahore' });
      await firstPromise;
    });

    expect(capturedSignals[0]?.aborted).toBe(true);
    expect(capturedSignals[1]?.aborted).toBe(false);
    expect(result.current.aqiData?.city).toBe('Lahore');
    expect(result.current.error).toBeNull();
  });

  it('aborts active in-flight request when hook unmounts', () => {
    let capturedSignal: AbortSignal | undefined;
    vi.spyOn(aqiService, 'fetchAqiDataByCity').mockImplementationOnce(
      (_city, signal) =>
        new Promise<AqiData>(() => {
          capturedSignal = signal;
        }),
    );

    const { result, unmount } = renderHook(() => useAssistant());
    act(() => {
      void result.current.requestRecommendations(DEFAULT_USER_PROFILE);
    });

    expect(capturedSignal?.aborted).toBe(false);
    unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
