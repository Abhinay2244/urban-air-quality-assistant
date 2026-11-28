import { describe, expect, it } from 'vitest';
import { createApp } from '../../../server/app.ts';
import { API_ENDPOINTS, ERROR_CODES, HTTP_STATUS } from '@shared/constants/http.ts';
import { SECURITY_HEADERS } from '@shared/constants/server.ts';
import { withEphemeralServer } from '../fixtures/serverHarness.ts';

describe('server createApp HTTP integration', () => {
  it('returns 400 JSON for malformed JSON bodies without HTML or stack traces', async () => {
    await withEphemeralServer(createApp, async (baseUrl) => {
      const res = await fetch(`${baseUrl}${API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{ invalid json',
      });

      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(res.headers.get('content-type')).toContain('application/json');
      expect(await res.json()).toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
    });
  });

  it('returns 413 JSON when payload exceeds the JSON body size limit', async () => {
    await withEphemeralServer(createApp, async (baseUrl) => {
      const oversized = JSON.stringify({ payload: 'x'.repeat(24 * 1024) });
      const res = await fetch(`${baseUrl}${API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: oversized,
      });

      expect(res.status).toBe(HTTP_STATUS.PAYLOAD_TOO_LARGE);
      expect(res.headers.get('content-type')).toContain('application/json');
      expect(await res.json()).toMatchObject({ code: ERROR_CODES.PAYLOAD_TOO_LARGE });
    });
  });

  it('returns 404 JSON for unknown /api routes and sets baseline security headers', async () => {
    await withEphemeralServer(createApp, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/non-existent-route`);

      expect(res.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(res.headers.get('content-type')).toContain('application/json');
      expect(res.headers.get('x-content-type-options')).toBe(SECURITY_HEADERS.CONTENT_TYPE_OPTIONS);
      expect(res.headers.get('x-frame-options')).toBe(SECURITY_HEADERS.FRAME_OPTIONS);
      expect(res.headers.get('referrer-policy')).toBe(SECURITY_HEADERS.REFERRER_POLICY);
      expect(res.headers.get('content-security-policy')).toBe(SECURITY_HEADERS.DEV_CSP);
      expect(await res.json()).toMatchObject({ code: ERROR_CODES.NOT_FOUND });
    });
  });
});
