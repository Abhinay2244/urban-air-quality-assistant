import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildRecommendationsCacheKey,
  createRecommendationsCache,
} from '../../../server/providers/geminiCache.ts';
import {
  classifyGeminiChainError,
  isModelUnavailableError,
} from '../../../server/providers/geminiErrors.ts';
import { createTimeoutError, waitForRetry } from '../../../server/providers/geminiTransport.ts';
import { DEFAULT_USER_PROFILE } from '@shared/constants/config.ts';
import { SAMPLE_SERVER_AQI } from '../fixtures/serverHarness.ts';

describe('server geminiErrors, geminiCache, and geminiTransport edge cases', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('classifies model-unavailable, transient-busy, and non-retryable errors accurately', () => {
    expect(isModelUnavailableError({ code: 'NOT_FOUND' })).toBe(true);
    expect(isModelUnavailableError(new Error('Model is not supported for generateContent'))).toBe(
      true,
    );
    expect(isModelUnavailableError({ status: 400 })).toBe(false);

    const isTimeout = (e: unknown): boolean => e instanceof Error && e.name === 'TimeoutError';
    expect(
      classifyGeminiChainError({ code: 'UNAVAILABLE' }, false, createTimeoutError, isTimeout),
    ).toBe('busy');
    expect(
      classifyGeminiChainError(
        { code: 'RESOURCE_EXHAUSTED' },
        false,
        createTimeoutError,
        isTimeout,
      ),
    ).toBe('busy');
    expect(
      classifyGeminiChainError(
        new Error('Backend overloaded'),
        false,
        createTimeoutError,
        isTimeout,
      ),
    ).toBe('busy');
    expect(() =>
      classifyGeminiChainError(new Error('Bad payload'), false, createTimeoutError, isTimeout),
    ).toThrow('Bad payload');
    expect(() =>
      classifyGeminiChainError(new Error('Ignored'), true, createTimeoutError, isTimeout),
    ).toThrow('Gemini request timed out');
  });

  it('prunes expired entries when full and updates existing cache keys', () => {
    const cache = createRecommendationsCache(1000, 2);
    const key1 = buildRecommendationsCacheKey(DEFAULT_USER_PROFILE, SAMPLE_SERVER_AQI, new Date(0));
    const key2 = buildRecommendationsCacheKey(
      { ...DEFAULT_USER_PROFILE, city: 'Noida' },
      SAMPLE_SERVER_AQI,
      new Date(0),
    );
    const key3 = buildRecommendationsCacheKey(
      { ...DEFAULT_USER_PROFILE, city: 'Mumbai' },
      SAMPLE_SERVER_AQI,
      new Date(0),
    );

    cache.set(key1, 'first', 100);
    cache.set(key1, 'updated-first', 200);
    expect(cache.get(key1, 250)).toBe('updated-first');

    cache.set(key2, 'second', 300);
    cache.set(key3, 'third', 1250);
    expect(cache.get(key1, 1250)).toBeNull();
    expect(cache.get(key2, 1250)).toBe('second');
    expect(cache.get(key3, 1250)).toBe('third');
  });

  it('rejects waitForRetry immediately or mid-delay when total budget aborts', async () => {
    const preAborted = new AbortController();
    preAborted.abort();
    await expect(waitForRetry(50, preAborted.signal)).rejects.toMatchObject({
      name: 'TimeoutError',
    });

    const controller = new AbortController();
    const pending = waitForRetry(500, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});
