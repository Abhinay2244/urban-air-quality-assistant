import { afterEach, describe, expect, it, vi } from 'vitest';
import { ERROR_MESSAGES, HTTP_STATUS } from '@shared/constants/http.ts';
import { fetchJsonOrThrow } from '../../services/httpClient.ts';
import { ErrorCode } from '@shared/types/index.ts';

const isTestPayload = (raw: unknown): raw is { ok: boolean } =>
  typeof raw === 'object' && raw !== null && 'ok' in raw;

const callFetch = (code: ErrorCode): Promise<{ ok: boolean }> =>
  fetchJsonOrThrow('/api/test', {
    fallbackCode: code,
    fallbackMessage: 'fallback',
    guard: isTestPayload,
  });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('httpClient fetchJsonOrThrow error mapping', () => {
  it('maps 429, 408/504, 400, and 500 empty-body responses to safe messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: HTTP_STATUS.TOO_MANY_REQUESTS }))
        .mockResolvedValueOnce(new Response('', { status: HTTP_STATUS.TOO_MANY_REQUESTS }))
        .mockResolvedValueOnce(new Response('', { status: HTTP_STATUS.REQUEST_TIMEOUT }))
        .mockResolvedValueOnce(new Response('', { status: HTTP_STATUS.BAD_REQUEST }))
        .mockResolvedValueOnce(new Response('', { status: HTTP_STATUS.BAD_REQUEST }))
        .mockResolvedValueOnce(new Response('', { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })),
    );

    await expect(callFetch(ErrorCode.AI_SERVICE_ERROR)).rejects.toMatchObject({
      message: ERROR_MESSAGES.AI_QUOTA_EXCEEDED,
    });
    await expect(callFetch(ErrorCode.AQI_FETCH_ERROR)).rejects.toMatchObject({
      message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
    });
    await expect(callFetch(ErrorCode.AQI_FETCH_ERROR)).rejects.toMatchObject({
      message: ERROR_MESSAGES.UPSTREAM_TIMEOUT,
    });
    await expect(callFetch(ErrorCode.AI_SERVICE_ERROR)).rejects.toMatchObject({
      message: ERROR_MESSAGES.INVALID_AI_REQUEST,
    });
    await expect(callFetch(ErrorCode.AQI_FETCH_ERROR)).rejects.toMatchObject({
      message: ERROR_MESSAGES.INVALID_REQUEST_BODY,
    });
    await expect(callFetch(ErrorCode.AQI_FETCH_ERROR)).rejects.toMatchObject({
      message: 'fallback',
    });
  });

  it('extracts { message } payloads, handles invalid JSON / guard mismatch, and rethrows AbortError', async () => {
    const abortErr = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ message: 'Custom server message' }), { status: 502 }),
        )
        .mockResolvedValueOnce(new Response('not-json', { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ wrong: true }), { status: 200 }))
        .mockRejectedValueOnce(new Error('unexpected non-typeerror'))
        .mockRejectedValueOnce(abortErr),
    );

    await expect(callFetch(ErrorCode.AQI_FETCH_ERROR)).rejects.toMatchObject({
      code: ErrorCode.AQI_FETCH_ERROR,
      message: 'Custom server message',
    });
    await expect(callFetch(ErrorCode.AQI_FETCH_ERROR)).rejects.toMatchObject({
      message: 'fallback',
    });
    await expect(callFetch(ErrorCode.AQI_FETCH_ERROR)).rejects.toMatchObject({
      message: 'fallback',
    });
    await expect(callFetch(ErrorCode.AQI_FETCH_ERROR)).rejects.toMatchObject({
      message: 'fallback',
    });
    await expect(callFetch(ErrorCode.AQI_FETCH_ERROR)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
