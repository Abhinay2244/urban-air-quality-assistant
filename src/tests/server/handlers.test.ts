import type { Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapGeminiUpstreamError } from '../../../server/errorResponse.ts';
import { handleAssistantRecommendations } from '../../../server/geminiHandler.ts';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../constants/limits.ts';
import { AQICategoryId } from '../../types/index.ts';

function createMockRes(): {
  res: Response;
  statusMock: ReturnType<typeof vi.fn>;
  jsonMock: ReturnType<typeof vi.fn>;
} {
  const jsonMock = vi.fn();
  const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
  return {
    res: { status: statusMock } as unknown as Response,
    statusMock,
    jsonMock,
  };
}

describe('server geminiHandler and upstream error mapping', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it('rejects invalid enums, non-boolean flags, and NaN AQI values with 400', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    const { res, statusMock, jsonMock } = createMockRes();

    await handleAssistantRecommendations(
      {
        body: {
          profile: { ...DEFAULT_USER_PROFILE, commuteMode: 'HELICOPTER', hasChildren: 'true' },
          aqiData: {
            city: 'New Delhi',
            country: 'India',
            aqi: Number.NaN,
            pm25: 120,
            pm10: 180,
            no2: 40,
            o3: 20,
            category: AQICategoryId.UNHEALTHY,
            updatedAt: '2026-11-18T08:00:00Z',
          },
        },
      } as unknown as Request,
      res,
    );

    expect(statusMock).toHaveBeenCalledWith(HTTP_STATUS.BAD_REQUEST);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: ERROR_CODES.VALIDATION_ERROR }),
    );
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
