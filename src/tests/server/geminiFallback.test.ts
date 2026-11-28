import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateRecommendationsText } from '../../../server/routes/geminiHandler.ts';
import { DEFAULT_USER_PROFILE } from '@shared/constants/config.ts';
import { ERROR_MESSAGES, HTTP_STATUS } from '@shared/constants/http.ts';
import { ASSISTANT_SYSTEM_INSTRUCTION } from '@shared/constants/prompts.ts';
import { GEMINI_CONFIG, GEMINI_MODEL_CHAIN } from '@shared/constants/server.ts';
import {
  postRecommendationJson,
  SAMPLE_SERVER_AQI,
  VALID_GEMINI_PLAN_JSON,
  withEphemeralServer,
} from '../fixtures/serverHarness.ts';
import { createTestApp } from '../fixtures/testApp.ts';

const generateMock = vi.hoisted(() =>
  vi.fn<
    (params: { model: string; config?: Record<string, unknown> }) => Promise<{ text?: string }>
  >(),
);

vi.mock('@google/genai', async () =>
  (await import('../fixtures/serverHarness.ts')).mockGenAiModule(generateMock),
);

const apiErr = (status: number): Error & { status: number } =>
  Object.assign(new Error('Upstream error'), { name: 'ApiError', status });
const calledModels = (): string[] => generateMock.mock.calls.map(([a]) => a.model);
const testApp = (): ReturnType<typeof createTestApp> =>
  createTestApp({ GEMINI_API_KEY: 'secret-test-key-xyz' });

describe('server Gemini model chain and retry behavior', () => {
  const loggedChunks: string[] = [];
  const stderrChunks: string[] = [];

  beforeEach(() => {
    loggedChunks.length = 0;
    stderrChunks.length = 0;
    vi.spyOn(process.stdout, 'write').mockImplementation((c) =>
      Boolean(loggedChunks.push(String(c))),
    );
    vi.spyOn(process.stderr, 'write').mockImplementation((c) => {
      loggedChunks.push(String(c));
      return Boolean(stderrChunks.push(String(c)));
    });
  });

  afterEach(() => {
    generateMock.mockReset();
    vi.restoreAllMocks();
  });

  it('retries first model once on 503 with thinking/token config and logs structured JSON safely', async () => {
    generateMock
      .mockRejectedValueOnce(apiErr(503))
      .mockResolvedValueOnce({ text: VALID_GEMINI_PLAN_JSON });

    const start = Date.now();
    await withEphemeralServer(testApp, async (baseUrl) => {
      const res = await postRecommendationJson(baseUrl, DEFAULT_USER_PROFILE, SAMPLE_SERVER_AQI);
      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.body).toEqual({ rawText: VALID_GEMINI_PLAN_JSON });
    });

    expect(Date.now() - start).toBeGreaterThanOrEqual(GEMINI_CONFIG.RETRY_DELAY_MS - 50);
    expect(calledModels()).toEqual([GEMINI_MODEL_CHAIN[0], GEMINI_MODEL_CHAIN[0]]);
    const secondConfig = generateMock.mock.calls[1]?.[0].config;
    expect(secondConfig).toEqual(
      expect.objectContaining({
        systemInstruction: ASSISTANT_SYSTEM_INSTRUCTION,
        responseMimeType: GEMINI_CONFIG.RESPONSE_MIME_TYPE,
        maxOutputTokens: GEMINI_CONFIG.MAX_OUTPUT_TOKENS,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      }),
    );
    expect(typeof secondConfig?.responseSchema).toBe('object');
    const logged = loggedChunks.join('');
    expect(logged).toContain(`"model":"${GEMINI_MODEL_CHAIN[0]}"`);
    expect(logged).toContain('"status":503');
    expect(logged).toContain('"Retrying Gemini model"');
    expect(logged).toContain('"Gemini model answered"');
    expect(logged).toContain('"requestId":"');
    expect(stderrChunks).toEqual([]);
    expect(logged).not.toContain('secret-test-key-xyz');
    expect(logged).not.toContain('"aqi":184');
  });

  it('moves to second model when first model fails twice with 503 and logs fallback', async () => {
    generateMock
      .mockRejectedValueOnce(apiErr(503))
      .mockRejectedValueOnce(apiErr(503))
      .mockResolvedValueOnce({ text: VALID_GEMINI_PLAN_JSON });

    await withEphemeralServer(testApp, async (baseUrl) => {
      const res = await postRecommendationJson(baseUrl, DEFAULT_USER_PROFILE, SAMPLE_SERVER_AQI);
      expect(res.status).toBe(HTTP_STATUS.OK);
    });
    expect(calledModels()).toEqual([
      GEMINI_MODEL_CHAIN[0],
      GEMINI_MODEL_CHAIN[0],
      GEMINI_MODEL_CHAIN[1],
    ]);
    const logged = loggedChunks.join('');
    expect(logged).toContain('"Falling back to next Gemini model"');
    expect(logged).toContain(`"model":"${GEMINI_MODEL_CHAIN[1]}"`);
    expect(stderrChunks).toEqual([]);
  });

  it('skips straight to the next model on 404 without retrying', async () => {
    generateMock
      .mockRejectedValueOnce(apiErr(404))
      .mockResolvedValueOnce({ text: VALID_GEMINI_PLAN_JSON });

    const start = Date.now();
    await withEphemeralServer(testApp, async (baseUrl) => {
      const res = await postRecommendationJson(baseUrl, DEFAULT_USER_PROFILE, SAMPLE_SERVER_AQI);
      expect(res.status).toBe(HTTP_STATUS.OK);
    });
    expect(Date.now() - start).toBeLessThan(GEMINI_CONFIG.RETRY_DELAY_MS);
    expect(calledModels()).toEqual([GEMINI_MODEL_CHAIN[0], GEMINI_MODEL_CHAIN[1]]);
    expect(stderrChunks).toEqual([]);
  });

  it('returns 503 busy message when all models fail with 503/429 and enforces total cap', async () => {
    GEMINI_MODEL_CHAIN.forEach((_, idx) => {
      const status = idx % 2 === 0 ? 503 : 429;
      generateMock.mockRejectedValueOnce(apiErr(status)).mockRejectedValueOnce(apiErr(status));
    });

    await withEphemeralServer(testApp, async (baseUrl) => {
      const res = await postRecommendationJson(baseUrl, DEFAULT_USER_PROFILE, SAMPLE_SERVER_AQI);
      expect(res.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
      expect(res.body).toMatchObject({ message: ERROR_MESSAGES.AI_SERVICE_BUSY });
    });
    expect(generateMock).toHaveBeenCalledTimes(GEMINI_MODEL_CHAIN.length * 2);
    expect(stderrChunks.join('')).toContain('request failed');

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
