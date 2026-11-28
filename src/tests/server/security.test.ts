import express from 'express';
import { describe, expect, it } from 'vitest';
import { ERROR_CODES, HTTP_STATUS } from '@shared/constants/http.ts';
import { SECURITY_HEADERS } from '@shared/constants/server.ts';
import {
  applySecurityHeaders,
  createApiRateLimiter,
} from '../../../server/middleware/securityMiddleware.ts';
import { withEphemeralServer } from '../fixtures/serverHarness.ts';

const testHeaderIp = (lastOctet: number): string => ['10', '0', '0', String(lastOctet)].join('.');

describe('server securityMiddleware', () => {
  it('sets baseline security headers, strict production CSP, and HTTPS-only HSTS behind trust proxy', async () => {
    await withEphemeralServer(
      () => {
        const app = express();
        app.set('trust proxy', 1);
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
        expect(devRes.headers.get('permissions-policy')).toBe(SECURITY_HEADERS.PERMISSIONS_POLICY);
        expect(devRes.headers.get('cross-origin-opener-policy')).toBe(
          SECURITY_HEADERS.CROSS_ORIGIN_OPENER_POLICY,
        );
        expect(devRes.headers.get('cross-origin-resource-policy')).toBe(
          SECURITY_HEADERS.CROSS_ORIGIN_RESOURCE_POLICY,
        );
        expect(devRes.headers.get('x-dns-prefetch-control')).toBe(
          SECURITY_HEADERS.DNS_PREFETCH_CONTROL,
        );
        expect(devRes.headers.get('strict-transport-security')).toBeNull();
        expect(devRes.headers.get('content-security-policy')).toBe(SECURITY_HEADERS.DEV_CSP);

        const prodHttpRes = await fetch(`${baseUrl}/prod`);
        const prodCsp = prodHttpRes.headers.get('content-security-policy') ?? '';
        expect(prodCsp).toBe(SECURITY_HEADERS.PROD_CSP);
        expect(prodCsp).toContain("script-src 'self'");
        expect(prodCsp).not.toContain("'unsafe-inline'");
        expect(prodCsp).not.toContain("'unsafe-eval'");
        expect(prodCsp).toContain("frame-ancestors 'self'");
        expect(prodHttpRes.headers.get('strict-transport-security')).toBeNull();

        const prodHttpsRes = await fetch(`${baseUrl}/prod`, {
          headers: { 'X-Forwarded-Proto': 'https' },
        });
        expect(prodHttpsRes.headers.get('strict-transport-security')).toBe(
          SECURITY_HEADERS.STRICT_TRANSPORT_SECURITY,
        );
      },
    );
  });

  it('enforces per-IP rate limits, returns 429 with Retry-After, and prunes expired entries', async () => {
    let fakeNow = 1_000_000;

    await withEphemeralServer(
      () => {
        const app = express();
        app.set('trust proxy', 1);
        app.use(
          '/api',
          createApiRateLimiter(2, 1000, 2, () => fakeNow),
          (_req, res) => res.json({ ok: true }),
        );
        return app;
      },
      async (baseUrl) => {
        const clientA = testHeaderIp(1);
        const res1 = await fetch(`${baseUrl}/api`, { headers: { 'X-Forwarded-For': clientA } });
        const res2 = await fetch(`${baseUrl}/api`, { headers: { 'X-Forwarded-For': clientA } });
        const blocked = await fetch(`${baseUrl}/api`, {
          headers: { 'X-Forwarded-For': clientA },
        });
        expect(res1.status).toBe(HTTP_STATUS.OK);
        expect(res2.status).toBe(HTTP_STATUS.OK);
        expect(blocked.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
        expect(blocked.headers.get('retry-after')).toMatch(/^\d+$/);
        expect(await blocked.json()).toMatchObject({ code: ERROR_CODES.RATE_LIMIT_EXCEEDED });

        fakeNow += 1100;
        const ip2 = await fetch(`${baseUrl}/api`, {
          headers: { 'X-Forwarded-For': testHeaderIp(2) },
        });
        const ip3 = await fetch(`${baseUrl}/api`, {
          headers: { 'X-Forwarded-For': testHeaderIp(3) },
        });
        expect(ip2.status).toBe(HTTP_STATUS.OK);
        expect(ip3.status).toBe(HTTP_STATUS.OK);
      },
    );
  });
});
