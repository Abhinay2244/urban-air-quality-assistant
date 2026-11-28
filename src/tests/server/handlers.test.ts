import { describe, expect, it } from 'vitest';
import { mapGeminiUpstreamError } from '../../../server/lib/errorResponse.ts';
import { DEFAULT_USER_PROFILE } from '@shared/constants/config.ts';
import { API_ENDPOINTS, ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '@shared/constants/http.ts';
import { AqiCategoryId } from '@shared/types/index.ts';
import { withEphemeralServer } from '../fixtures/serverHarness.ts';
import { createTestApp } from '../fixtures/testApp.ts';

describe('server geminiHandler and upstream error mapping', () => {
  it('rejects invalid enums, non-boolean flags, and NaN AQI values with 400 over HTTP', async () => {
    await withEphemeralServer(
      () => createTestApp({ GEMINI_API_KEY: 'test-key' }),
      async (baseUrl) => {
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
      },
    );
  });

  it('accepts live AQI above 500 without 400 and returns safe 503 when GEMINI_API_KEY is missing', async () => {
    await withEphemeralServer(
      () => createTestApp({}),
      async (baseUrl) => {
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
        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await response.json()).toMatchObject({
          code: ERROR_CODES.AI_SERVICE_ERROR,
          message: ERROR_MESSAGES.AI_SERVICE_BUSY,
        });
      },
    );
  });

  it('accepts city AQI payloads with digits/parentheses in stationName and optional fields omitted', async () => {
    const postRecommendations = (
      baseUrl: string,
      aqiData: Record<string, unknown>,
    ): Promise<Response> =>
      fetch(`${baseUrl}${API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: { ...DEFAULT_USER_PROFILE, city: 'Delhi' },
          aqiData,
        }),
      });

    await withEphemeralServer(
      () => createTestApp({}),
      async (baseUrl) => {
        const withExtras = await postRecommendations(baseUrl, {
          city: 'Delhi',
          country: 'India',
          stationName: 'R K Puram (Sector 2), Station 14',
          aqi: 175,
          pm25: 98,
          no2: 42,
          o3: 31,
          category: AqiCategoryId.UNHEALTHY,
        });
        const omittedOptional = await postRecommendations(baseUrl, {
          city: 'Delhi',
          country: 'India',
          aqi: 120,
          pm25: 45,
          category: AqiCategoryId.UNHEALTHY_SENSITIVE,
        });

        expect(withExtras.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(omittedOptional.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
      },
    );
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
    expect(mapGeminiUpstreamError({ status: 503 })).toEqual({
      status: HTTP_STATUS.SERVICE_UNAVAILABLE,
      message: ERROR_MESSAGES.AI_SERVICE_BUSY,
    });
    const timeoutErr = new Error('Signal timed out');
    timeoutErr.name = 'TimeoutError';
    expect(mapGeminiUpstreamError(timeoutErr)).toEqual({
      status: HTTP_STATUS.GATEWAY_TIMEOUT,
      message: ERROR_MESSAGES.UPSTREAM_TIMEOUT,
    });
  });
});
