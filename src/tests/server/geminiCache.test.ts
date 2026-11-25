import { GoogleGenAI } from '@google/genai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../server/app.ts';
import {
  buildRecommendationsCacheKey,
  createRecommendationsCache,
} from '../../../server/geminiCache.ts';
import { generateRecommendationsText } from '../../../server/geminiHandler.ts';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import { HTTP_STATUS } from '../../constants/http.ts';
import { GEMINI_MODEL_CHAIN } from '../../constants/server.ts';
import { AqiCategoryId, type AqiData, FamilyType } from '../../types/index.ts';
import {
  postRecommendationJson,
  VALID_GEMINI_PLAN_JSON,
  withEphemeralServer,
} from '../fixtures/serverHarness.ts';

const generateMock = vi.hoisted(() =>
  vi.fn<(params: { model: string }) => Promise<{ text?: string }>>(),
);

vi.mock('@google/genai', async () =>
  (await import('../fixtures/serverHarness.ts')).mockGenAiModule(generateMock),
);

const BASE_AQI: AqiData = {
  city: 'Delhi',
  country: 'India',
  aqi: 184,
  pm25: 105,
  category: AqiCategoryId.UNHEALTHY,
};

describe('Gemini per-attempt timeout fallback and recommendations cache', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
    generateMock.mockReset();
    vi.restoreAllMocks();
  });

  it('moves straight to the next model on per-attempt timeout without retrying', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    generateMock
      .mockImplementationOnce(() => new Promise(() => undefined))
      .mockResolvedValueOnce({ text: '{"summary":"ok"}' });

    const ai = new GoogleGenAI({ apiKey: 'test-key' });
    const text = await generateRecommendationsText(ai, 'prompt', {
      retryDelayMs: 50,
      perAttemptTimeoutMs: 25,
      totalTimeoutMs: 500,
    });

    expect(text).toBe('{"summary":"ok"}');
    expect(generateMock.mock.calls.map(([a]) => a.model)).toEqual([
      GEMINI_MODEL_CHAIN[0],
      GEMINI_MODEL_CHAIN[1],
    ]);
  });

  it('supports cache hit, TTL miss, and oldest-first FIFO eviction', () => {
    const cache = createRecommendationsCache(1000, 2);
    cache.set('k1', 'p1', 100);
    cache.set('k2', 'p2', 200);
    expect(cache.get('k1', 500)).toBe('p1');

    cache.set('k3', 'p3', 600);
    expect(cache.size()).toBe(2);
    expect(cache.get('k1', 600)).toBeNull();
    expect(cache.get('k2', 600)).toBe('p2');
    expect(cache.get('k2', 1200)).toBeNull();
  });

  it('isolates cache keys by city, persona, sensitivity, AQI bucket, and hour', () => {
    const now = new Date('2026-11-25T10:15:00Z');
    const baseKey = buildRecommendationsCacheKey(DEFAULT_USER_PROFILE, BASE_AQI, now);
    const sameBucketKey = buildRecommendationsCacheKey(
      DEFAULT_USER_PROFILE,
      { ...BASE_AQI, aqi: 181 },
      now,
    );
    const diffCity = buildRecommendationsCacheKey(
      { ...DEFAULT_USER_PROFILE, city: 'Mumbai' },
      { ...BASE_AQI, city: 'Mumbai' },
      now,
    );
    const diffPersona = buildRecommendationsCacheKey(
      { ...DEFAULT_USER_PROFILE, familyType: FamilyType.STUDENT },
      BASE_AQI,
      now,
    );
    const diffSensitivity = buildRecommendationsCacheKey(
      { ...DEFAULT_USER_PROFILE, hasRespiratoryCondition: true },
      BASE_AQI,
      now,
    );

    expect(sameBucketKey).toBe(baseKey);
    expect(new Set([baseKey, diffCity, diffPersona, diffSensitivity]).size).toBe(4);
  });

  it('serves cached valid plans over HTTP and skips caching errors or fallback responses', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    generateMock
      .mockResolvedValueOnce({ text: 'not-valid-json' })
      .mockResolvedValueOnce({ text: VALID_GEMINI_PLAN_JSON });

    await withEphemeralServer(createApp, async (baseUrl) => {
      const first = await postRecommendationJson(baseUrl, DEFAULT_USER_PROFILE, BASE_AQI);
      expect(first.status).toBe(HTTP_STATUS.OK);
      const second = await postRecommendationJson(baseUrl, DEFAULT_USER_PROFILE, BASE_AQI);
      expect(second.status).toBe(HTTP_STATUS.OK);
      const third = await postRecommendationJson(baseUrl, DEFAULT_USER_PROFILE, {
        ...BASE_AQI,
        aqi: 181,
      });
      expect(third.body).toEqual({ rawText: VALID_GEMINI_PLAN_JSON });
    });

    expect(generateMock).toHaveBeenCalledTimes(2);
  });
});
