import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INPUT_LIMITS } from '../../constants/limits.ts';
import { useCityAutocomplete } from '../../features/profile/useCityAutocomplete.ts';
import * as citySearchService from '../../services/citySearchService.ts';
import type { CitySearchResult } from '../../types/index.ts';

describe('useCityAutocomplete cancellation and debounce', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('aborts stale /api/cities requests and ignores out-of-order responses when query changes', async () => {
    vi.useFakeTimers();
    const signals: Array<AbortSignal | undefined> = [];
    let resolveFirst: ((cities: CitySearchResult[]) => void) | undefined;

    vi.spyOn(citySearchService, 'searchIndianCitiesClient')
      .mockImplementationOnce(
        (_query, signal) =>
          new Promise<CitySearchResult[]>((resolve) => {
            signals.push(signal);
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(async (_query, signal) => {
        signals.push(signal);
        return [{ name: 'Noida', country: 'India', latitude: 28.53, longitude: 77.39 }];
      });

    const { result } = renderHook(() => useCityAutocomplete());

    act(() => {
      result.current.triggerCitySearch('Del');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INPUT_LIMITS.CITY_SEARCH_DEBOUNCE_MS);
    });
    expect(signals).toHaveLength(1);
    expect(signals[0]?.aborted).toBe(false);

    act(() => {
      result.current.triggerCitySearch('Noida');
    });
    expect(signals[0]?.aborted).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(INPUT_LIMITS.CITY_SEARCH_DEBOUNCE_MS);
    });
    expect(signals).toHaveLength(2);
    expect(signals[1]?.aborted).toBe(false);
    expect(result.current.suggestions.map((item) => item.name)).toEqual(['Noida']);

    await act(async () => {
      resolveFirst?.([{ name: 'Delhi', country: 'India', latitude: 28.61, longitude: 77.21 }]);
      await Promise.resolve();
    });
    expect(result.current.suggestions.map((item) => item.name)).toEqual(['Noida']);
  });
});
