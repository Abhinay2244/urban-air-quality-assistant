import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../server/app.ts';
import { mapGeminiUpstreamError } from '../../../server/errorResponse.ts';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import { API_ENDPOINTS, ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../constants/http.ts';
import { AqiCategoryId } from '../../types/index.ts';
import { withEphemeralServer } from '../fixtures/serverHarness.ts';

describe('server geminiHandler and upstream error mapping', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it('rejects invalid enums, non-boolean flags, and NaN AQI values with 400 over HTTP', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    await withEphemeralServer(createApp, async (baseUrl) => {
      const response = await fetch(`${baseUrl}${API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { ...DEFAULT_USER_PROFILE, commuteMode: 'HELICOPTER', hasChildren: 'true' },
          aqiData: {
            city: 'New Delhi',
            country: 'India',
            aqi: null,
            pm25: 120,
            pm10: 180,
            no2: 40,
            o3: 20,
            category: AqiCategoryId.VERY_UNHEALTHY,
            updatedAt: '2026-11-18T08:00:00Z',
          },
        }),
      });

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      const body: unknown = await response.json();
      expect(body).toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
    });
  });

  it('accepts live AQI above 500 without returning a 400 validation error', async () => {
    delete process.env.GEMINI_API_KEY;
    await withEphemeralServer(createApp, async (baseUrl) => {
      const response = await fetch(`${baseUrl}${API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: DEFAULT_USER_PROFILE,
          aqiData: {
            city: 'Delhi',
            country: 'India',
            aqi: 640,
            pm25: 410,
            no2: 60,
            o3: 20,
            category: AqiCategoryId.HAZARDOUS,
            updatedAt: '2026-11-18T08:00:00Z',
          },
        }),
      });
      // Reaching missing-key check (500) proves payload validation accepted AQI 640
      expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  it('accepts coordinate-based AQI payloads with digits/parentheses and optional fields omitted', async () => {
    delete process.env.GEMINI_API_KEY;
    const postRecommendations = (
      baseUrl: string,
      aqiData: Record<string, unknown>,
    ): Promise<Response> =>
      fetch(`${baseUrl}${API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { ...DEFAULT_USER_PROFILE, city: 'Current location' },
          aqiData,
        }),
      });

    await withEphemeralServer(createApp, async (baseUrl) => {
      const withExtras = await postRecommendations(baseUrl, {
        city: 'Current location',
        country: 'India',
        stationName: 'R K Puram (Sector 2), Station 14',
        aqi: 175,
        pm25: 98,
        no2: 42,
        o3: 31,
        category: AqiCategoryId.UNHEALTHY,
      });
      const omittedOptional = await postRecommendations(baseUrl, {
        city: 'Current location',
        country: 'India',
        aqi: 120,
        pm25: 45,
        category: AqiCategoryId.UNHEALTHY_SENSITIVE,
      });

      expect(withExtras.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
      expect(omittedOptional.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  it('maps known upstream Gemini error statuses to safe user messages without raw details', () => {
    expect(mapGeminiUpstreamError({ status: 403 })).toEqual({
      status: HTTP_STATUS.BAD_GATEWAY,
      message: ERROR_MESSAGES.AI_AUTH_ERROR,
    });
    expect(mapGeminiUpstreamError({ status: 400 })).toEqual({
      status: HTTP_STATUS.BAD_REQUEST,
      message: ERROR_MESSAGES.INVALID_AI_REQUEST,
    });
    expect(mapGeminiUpstreamError({ status: 429 })).toEqual({
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      message: ERROR_MESSAGES.AI_QUOTA_EXCEEDED,
    });
    expect(mapGeminiUpstreamError({ status: 404 })).toEqual({
      status: HTTP_STATUS.BAD_GATEWAY,
      message: ERROR_MESSAGES.AI_MODEL_NOT_FOUND,
    });
    const timeoutErr = new Error('Signal timed out');
    timeoutErr.name = 'TimeoutError';
    expect(mapGeminiUpstreamError(timeoutErr)).toEqual({
      status: HTTP_STATUS.GATEWAY_TIMEOUT,
      message: ERROR_MESSAGES.UPSTREAM_TIMEOUT,
    });
  });
});
