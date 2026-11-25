import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../server/app.ts';
import { generateRecommendationsText } from '../../../server/geminiHandler.ts';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import { ERROR_MESSAGES, HTTP_STATUS } from '../../constants/http.ts';
import { ASSISTANT_SYSTEM_INSTRUCTION } from '../../constants/prompts.ts';
import { GEMINI_CONFIG, GEMINI_MODEL_CHAIN } from '../../constants/server.ts';
import {
  postRecommendationJson,
  SAMPLE_SERVER_AQI,
  VALID_GEMINI_PLAN_JSON,
  withEphemeralServer,
} from '../fixtures/serverHarness.ts';

const generateMock = vi.hoisted(() =>
  vi.fn<(params: { model: string; config?: unknown }) => Promise<{ text?: string }>>(),
);

vi.mock('@google/genai', async () =>
  (await import('../fixtures/serverHarness.ts')).mockGenAiModule(generateMock),
);

const SAMPLE_AQI = SAMPLE_SERVER_AQI;
const apiErr = (status: number): Error & { status: number } =>
  Object.assign(new Error('Upstream error'), { name: 'ApiError', status });
const calledModels = (): string[] => generateMock.mock.calls.map(([a]) => a.model);

describe('server Gemini model chain and retry behavior', () => {
  const originalKey = process.env.GEMINI_API_KEY;
  const loggedChunks: string[] = [];

  beforeEach(() => {
    loggedChunks.length = 0;
    process.env.GEMINI_API_KEY = 'secret-test-key-xyz';
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      loggedChunks.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
    generateMock.mockReset();
    vi.restoreAllMocks();
  });

  it('retries first model once on 503 with thinking/token config and logs safely', async () => {
    generateMock
      .mockRejectedValueOnce(apiErr(503))
      .mockResolvedValueOnce({ text: VALID_GEMINI_PLAN_JSON });

    const start = Date.now();
    await withEphemeralServer(createApp, async (baseUrl) => {
      const res = await postRecommendationJson(baseUrl, DEFAULT_USER_PROFILE, SAMPLE_AQI);
      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body).toEqual({ rawText: VALID_GEMINI_PLAN_JSON });
    });

    expect(Date.now() - start).toBeGreaterThanOrEqual(GEMINI_CONFIG.RETRY_DELAY_MS - 50);
    expect(calledModels()).toEqual([GEMINI_MODEL_CHAIN[0], GEMINI_MODEL_CHAIN[0]]);
    expect(generateMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        config: expect.objectContaining({
          systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
          responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
          maxOutputTokens: GEMINI_CONFIG.MAX_OUTPUT_TOKENS,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: expect.any(Object),
        }) as Record<string, unknown>,
      }),
    );
    const logged = loggedChunks.join('');
    expect(logged).toContain(`model=${GEMINI_MODEL_CHAIN[0]} status=503 type=ApiError`);
    expect(logged).toContain(`[Gemini Success] model=${GEMINI_MODEL_CHAIN[0]}`);
    expect(logged).not.toContain('secret-test-key-xyz');
    expect(logged).not.toContain('"aqi":184');
  });

  it('moves to second model when first model fails twice with 503', async () => {
    generateMock
      .mockRejectedValueOnce(apiErr(503))
      .mockRejectedValueOnce(apiErr(503))
      .mockResolvedValueOnce({ text: VALID_GEMINI_PLAN_JSON });

    await withEphemeralServer(createApp, async (baseUrl) => {
      expect((await postRecommendationJson(baseUrl, DEFAULT_USER_PROFILE, SAMPLE_AQI)).status).toBe(
        HTTP_STATUS.OK,
      );
    });
    expect(calledModels()).toEqual([
      GEMINI_MODEL_CHAIN[0],
      GEMINI_MODEL_CHAIN[0],
      GEMINI_MODEL_CHAIN[1],
    ]);
    expect(loggedChunks.join('')).toContain(`[Gemini Success] model=${GEMINI_MODEL_CHAIN[1]}`);
  });

  it('skips straight to the next model on 404 without retrying', async () => {
    generateMock
      .mockRejectedValueOnce(apiErr(404))
      .mockResolvedValueOnce({ text: VALID_GEMINI_PLAN_JSON });

    const start = Date.now();
    await withEphemeralServer(createApp, async (baseUrl) => {
      expect((await postRecommendationJson(baseUrl, DEFAULT_USER_PROFILE, SAMPLE_AQI)).status).toBe(
        HTTP_STATUS.OK,
      );
    });
    expect(Date.now() - start).toBeLessThan(GEMINI_CONFIG.RETRY_DELAY_MS);
    expect(calledModels()).toEqual([GEMINI_MODEL_CHAIN[0], GEMINI_MODEL_CHAIN[1]]);
  });

  it('returns 503 busy message when all models fail with 503/429 and enforces total cap', async () => {
    GEMINI_MODEL_CHAIN.forEach((_, idx) => {
      const status = idx % 2 === 0 ? 503 : 429;
      generateMock.mockRejectedValueOnce(apiErr(status)).mockRejectedValueOnce(apiErr(status));
    });

    await withEphemeralServer(createApp, async (baseUrl) => {
      const res = await postRecommendationJson(baseUrl, DEFAULT_USER_PROFILE, SAMPLE_AQI);
      expect(res.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
      expect(res.body).toMatchObject({ message: ERROR_MESSAGES.AI_SERVICE_BUSY });
    });
    expect(generateMock).toHaveBeenCalledTimes(GEMINI_MODEL_CHAIN.length * 2);
    expect(GEMINI_MODEL_CHAIN.join(',')).toBe(
      'gemini-3.5-flash,gemini-3.6-flash,gemini-3.7-flash,gemini-3.5-flash-lite',
    );

    generateMock.mockImplementation(() => new Promise(() => undefined));
    const ai = new GoogleGenAI({ apiKey: 'secret-test-key-xyz' });
    await expect(
      generateRecommendationsText(ai, 'prompt', {
        retryDelayMs: 10,
        perAttemptTimeoutMs: 20,
        totalTimeoutMs: 30,
      }),
    ).rejects.toMatchObject({ name: 'TimeoutError' });
  });
});
