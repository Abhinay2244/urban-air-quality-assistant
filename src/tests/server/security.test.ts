import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applySecurityHeaders, createApiRateLimiter } from '../../../server/securityMiddleware.ts';
import { ERROR_CODES, HTTP_STATUS } from '../../constants/http.ts';
import { SECURITY_HEADERS } from '../../constants/server.ts';
import { withEphemeralServer } from '../fixtures/serverHarness.ts';

describe('server securityMiddleware', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets baseline security headers and environment-specific CSP', async () => {
    await withEphemeralServer(
      () => {
        const app = express();
        app.use('/dev', applySecurityHeaders(false), (_req, res) => res.json({ ok: true }));
        app.use('/prod', applySecurityHeaders(true), (_req, res) => res.json({ ok: true }));
        return app;
      },
      async (baseUrl) => {
        const devRes = await fetch(`${baseUrl}/dev`);
        expect(devRes.headers.get('x-content-type-options')).toBe(
          SECURITY_HEADERS.CONTENT_TYPE_OPTIONS,
        );
        expect(devRes.headers.get('x-frame-options')).toBe(SECURITY_HEADERS.FRAME_OPTIONS);
        expect(devRes.headers.get('referrer-policy')).toBe(SECURITY_HEADERS.REFERRER_POLICY);
        expect(devRes.headers.get('content-security-policy')).toBe(SECURITY_HEADERS.DEV_CSP);

        const prodRes = await fetch(`${baseUrl}/prod`);
        expect(prodRes.headers.get('content-security-policy')).toBe(SECURITY_HEADERS.PROD_CSP);
      },
    );
  });

  it('enforces per-IP rate limits, returns 429 with Retry-After, and prunes expired entries', async () => {
    let fakeNow = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => fakeNow);

    await withEphemeralServer(
      () => {
        const app = express();
        app.set('trust proxy', 1);
        app.use('/api', createApiRateLimiter(2, 1000, 2), (_req, res) => res.json({ ok: true }));
        return app;
      },
      async (baseUrl) => {
        const res1 = await fetch(`${baseUrl}/api`, { headers: { 'X-Forwarded-For': '10.0.0.1' } });
        const res2 = await fetch(`${baseUrl}/api`, { headers: { 'X-Forwarded-For': '10.0.0.1' } });
        const blocked = await fetch(`${baseUrl}/api`, {
          headers: { 'X-Forwarded-For': '10.0.0.1' },
        });
        expect(res1.status).toBe(HTTP_STATUS.OK);
        expect(res2.status).toBe(HTTP_STATUS.OK);
        expect(blocked.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
        expect(blocked.headers.get('retry-after')).toMatch(/^\d+$/);
        expect(await blocked.json()).toMatchObject({ code: ERROR_CODES.RATE_LIMIT_EXCEEDED });

        fakeNow += 1100;
        const ip2 = await fetch(`${baseUrl}/api`, { headers: { 'X-Forwarded-For': '10.0.0.2' } });
        const ip3 = await fetch(`${baseUrl}/api`, { headers: { 'X-Forwarded-For': '10.0.0.3' } });
        expect(ip2.status).toBe(HTTP_STATUS.OK);
        expect(ip3.status).toBe(HTTP_STATUS.OK);
      },
    );
  });
});
