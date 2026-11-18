import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { applySecurityHeaders, createApiRateLimiter } from '../../../server/securityMiddleware.ts';
import { ERROR_CODES, HTTP_STATUS, SECURITY_HEADERS } from '../../constants/limits.ts';

interface MockResponseHandle {
  res: Response;
  headers: Map<string, string>;
  statusMock: ReturnType<typeof vi.fn>;
  jsonMock: ReturnType<typeof vi.fn>;
}

function createMockExpressRes(): MockResponseHandle {
  const headers = new Map<string, string>();
  const jsonMock = vi.fn();
  const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
  const res = {
    setHeader: vi.fn((name: string, value: string) => {
      headers.set(name, value);
    }),
    status: statusMock,
  } as unknown as Response;

  return { res, headers, statusMock, jsonMock };
}

function createMockReq(ip: string): Request {
  return {
    ip,
    socket: { remoteAddress: ip },
  } as unknown as Request;
}

describe('server securityMiddleware', () => {
  it('sets baseline security headers and environment-specific CSP', () => {
    const devMiddleware = applySecurityHeaders(false);
    const devHandle = createMockExpressRes();
    const devNext = vi.fn() as unknown as NextFunction;

    devMiddleware(createMockReq('127.0.0.1'), devHandle.res, devNext);
    expect(devNext).toHaveBeenCalledTimes(1);
    expect(devHandle.headers.get('X-Content-Type-Options')).toBe(
      SECURITY_HEADERS.CONTENT_TYPE_OPTIONS,
    );
    expect(devHandle.headers.get('X-Frame-Options')).toBe(SECURITY_HEADERS.FRAME_OPTIONS);
    expect(devHandle.headers.get('Referrer-Policy')).toBe(SECURITY_HEADERS.REFERRER_POLICY);
    expect(devHandle.headers.get('Content-Security-Policy')).toBe(SECURITY_HEADERS.DEV_CSP);

    const prodMiddleware = applySecurityHeaders(true);
    const prodHandle = createMockExpressRes();
    const prodNext = vi.fn() as unknown as NextFunction;

    prodMiddleware(createMockReq('127.0.0.1'), prodHandle.res, prodNext);
    expect(prodHandle.headers.get('Content-Security-Policy')).toBe(SECURITY_HEADERS.PROD_CSP);
  });

  it('enforces per-IP rate limits on API routes and returns 429 with Retry-After', () => {
    const limiter = createApiRateLimiter(2, 60_000);
    const nextMock = vi.fn() as unknown as NextFunction;

    const first = createMockExpressRes();
    limiter(createMockReq('10.0.0.1'), first.res, nextMock);
    const second = createMockExpressRes();
    limiter(createMockReq('10.0.0.1'), second.res, nextMock);
    expect(nextMock).toHaveBeenCalledTimes(2);

    const blocked = createMockExpressRes();
    limiter(createMockReq('10.0.0.1'), blocked.res, nextMock);
    expect(blocked.statusMock).toHaveBeenCalledWith(HTTP_STATUS.TOO_MANY_REQUESTS);
    expect(blocked.headers.has('Retry-After')).toBe(true);
    expect(blocked.jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: ERROR_CODES.RATE_LIMIT_EXCEEDED }),
    );

    const otherIp = createMockExpressRes();
    limiter(createMockReq('10.0.0.2'), otherIp.res, nextMock);
    expect(nextMock).toHaveBeenCalledTimes(3);
  });
});
