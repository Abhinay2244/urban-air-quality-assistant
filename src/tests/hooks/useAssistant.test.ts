import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import { useAssistant } from '../../hooks/useAssistant.ts';
import * as aqiService from '../../services/aqiService.ts';
import * as geminiService from '../../services/geminiService.ts';
import { ErrorCode } from '../../types/index.ts';
import { createAppError } from '../../utils/errors.ts';
import {
  MOCK_AQI_FIXTURE,
  MOCK_ASSISTANT_RESPONSE_FIXTURE,
} from '../fixtures/assistantFixtures.ts';

async function setupAndRequest(): Promise<
  ReturnType<typeof renderHook<ReturnType<typeof useAssistant>, unknown>>
> {
  const hook = renderHook(() => useAssistant());
  await act(async () => {
    await hook.result.current.requestRecommendations(DEFAULT_USER_PROFILE);
  });
  return hook;
}

describe('useAssistant hook', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches AQI data, applies urgency rules, and starts submit cooldown', async () => {
    vi.spyOn(aqiService, 'fetchAqiDataByCity').mockResolvedValueOnce(MOCK_AQI_FIXTURE);
    vi.spyOn(geminiService, 'getAirQualityRecommendations').mockResolvedValueOnce(
      MOCK_ASSISTANT_RESPONSE_FIXTURE,
    );

    const { result } = await setupAndRequest();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.aqiData).toEqual(MOCK_AQI_FIXTURE);
    expect(result.current.assistantResponse?.recommendations.length).toBeGreaterThan(0);
    expect(result.current.cooldownSeconds).toBeGreaterThan(0);
    expect(result.current.cooldownNotice).toBeNull();
  });

  it('enables manual AQI fallback when live AQI fetch fails and generates plan manually', async () => {
    vi.spyOn(aqiService, 'fetchAqiDataByCity').mockRejectedValueOnce(
      createAppError(ErrorCode.AQI_FETCH_ERROR, 'API down'),
    );
    vi.spyOn(geminiService, 'getAirQualityRecommendations').mockResolvedValueOnce(
      MOCK_ASSISTANT_RESPONSE_FIXTURE,
    );

    const { result } = await setupAndRequest();

    expect(result.current.isAqiUnavailable).toBe(true);
    expect(result.current.error?.code).toBe(ErrorCode.AQI_FETCH_ERROR);

    await act(async () => {
      await result.current.requestRecommendationsWithManualAqi(DEFAULT_USER_PROFILE, 185);
    });

    expect(result.current.isAqiUnavailable).toBe(false);
    expect(result.current.aqiData?.source).toBe('manual');
    expect(result.current.assistantResponse).not.toBeNull();
  });

  it('keeps manual form visible with AI_SERVICE_ERROR and retries manual mode', async () => {
    const fetchSpy = vi.spyOn(aqiService, 'fetchAqiDataByCity');
    const aiSpy = vi
      .spyOn(geminiService, 'getAirQualityRecommendations')
      .mockRejectedValueOnce(new Error('Upstream AI error'))
      .mockResolvedValueOnce(MOCK_ASSISTANT_RESPONSE_FIXTURE);

    const { result } = renderHook(() => useAssistant());
    await act(async () => {
      await result.current.requestRecommendationsWithManualAqi(DEFAULT_USER_PROFILE, 195);
    });

    expect(result.current.isAqiUnavailable).toBe(true);
    expect(result.current.error?.code).toBe(ErrorCode.AI_SERVICE_ERROR);

    await act(async () => {
      await result.current.retryLastRequest();
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(aiSpy).toHaveBeenCalledTimes(2);
    expect(result.current.isAqiUnavailable).toBe(false);
    expect(result.current.aqiData?.source).toBe('manual');
    expect(result.current.error).toBeNull();
  });
});
