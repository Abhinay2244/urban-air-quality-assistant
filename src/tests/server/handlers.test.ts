import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../../../server/app.ts';
import { mapGeminiUpstreamError } from '../../../server/errorResponse.ts';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import { API_ENDPOINTS, ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../constants/http.ts';
import { AqiCategoryId } from '../../types/index.ts';

describe('server geminiHandler and upstream error mapping', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
  });

  it('rejects invalid enums, non-boolean flags, and NaN AQI values with 400 over HTTP', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const app = await createApp();
    const server = app.listen(0);

    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Expected TCP server address');
      }
      const response = await fetch(
        `http://127.0.0.1:${address.port}${API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS}`,
        {
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
              category: AqiCategoryId.UNHEALTHY,
              updatedAt: '2026-11-18T08:00:00Z',
            },
          }),
        },
      );

      expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
      const body: unknown = await response.json();
      expect(body).toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
    } finally {
      server.close();
    }
  });

  it('maps known upstream Gemini error statuses to safe user messages without raw details', () => {
    expect(mapGeminiUpstreamError({ status: 403 })).toEqual({
      status: HTTP_STATUS.BAD_GATEWAY,
      message: ERROR_MESSAGES.AI_AUTH_ERROR,
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
