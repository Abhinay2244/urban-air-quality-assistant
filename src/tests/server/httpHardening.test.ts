import { describe, expect, it } from 'vitest';
import { createApp } from '../../../server/app.ts';
import { API_ENDPOINTS, ERROR_CODES, HTTP_STATUS } from '@shared/constants/http.ts';
import { withEphemeralServer } from '../fixtures/serverHarness.ts';

describe('server API HTTP hardening (x-powered-by, 415, 405, same-origin CORS)', () => {
  it('disables x-powered-by header on API responses', async () => {
    await withEphemeralServer(createApp, async (baseUrl) => {
      const res = await fetch(`${baseUrl}${API_ENDPOINTS.HEALTH}`);
      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(res.headers.get('x-powered-by')).toBeNull();
    });
  });

  it('requires application/json Content-Type on POST routes and returns 415 otherwise', async () => {
    await withEphemeralServer(createApp, async (baseUrl) => {
      const textRes = await fetch(`${baseUrl}${API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'plain text',
      });
      expect(textRes.status).toBe(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE);
      expect(await textRes.json()).toMatchObject({ code: ERROR_CODES.UNSUPPORTED_MEDIA_TYPE });

      const missingHeaderRes = await fetch(`${baseUrl}${API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS}`, {
        method: 'POST',
      });
      expect(missingHeaderRes.status).toBe(HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE);
      expect(await missingHeaderRes.json()).toMatchObject({
        code: ERROR_CODES.UNSUPPORTED_MEDIA_TYPE,
      });
    });
  });

  it('allows only configured HTTP methods per route and returns 405 with Allow header', async () => {
    await withEphemeralServer(createApp, async (baseUrl) => {
      const postHealth = await fetch(`${baseUrl}${API_ENDPOINTS.HEALTH}`, { method: 'POST' });
      expect(postHealth.status).toBe(HTTP_STATUS.METHOD_NOT_ALLOWED);
      expect(postHealth.headers.get('allow')).toBe('GET');
      expect(await postHealth.json()).toMatchObject({ code: ERROR_CODES.METHOD_NOT_ALLOWED });

      const delAqi = await fetch(`${baseUrl}${API_ENDPOINTS.AQI_LIVE}`, { method: 'DELETE' });
      expect(delAqi.status).toBe(HTTP_STATUS.METHOD_NOT_ALLOWED);
      expect(delAqi.headers.get('allow')).toBe('GET');

      const putCities = await fetch(`${baseUrl}${API_ENDPOINTS.CITIES_SEARCH}`, { method: 'PUT' });
      expect(putCities.status).toBe(HTTP_STATUS.METHOD_NOT_ALLOWED);
      expect(putCities.headers.get('allow')).toBe('GET');

      const getAssistant = await fetch(`${baseUrl}${API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS}`);
      expect(getAssistant.status).toBe(HTTP_STATUS.METHOD_NOT_ALLOWED);
      expect(getAssistant.headers.get('allow')).toBe('POST');
      expect(await getAssistant.json()).toMatchObject({ code: ERROR_CODES.METHOD_NOT_ALLOWED });
    });
  });

  it('enforces explicit same-origin CORS policy without wildcards', async () => {
    await withEphemeralServer(createApp, async (baseUrl) => {
      const sameOriginRes = await fetch(`${baseUrl}${API_ENDPOINTS.HEALTH}`, {
        headers: { Origin: baseUrl },
      });
      expect(sameOriginRes.status).toBe(HTTP_STATUS.OK);
      expect(sameOriginRes.headers.get('access-control-allow-origin')).toBe(baseUrl);
      expect(sameOriginRes.headers.get('access-control-allow-origin')).not.toBe('*');
      expect(sameOriginRes.headers.get('vary')).toContain('Origin');

      const preflightRes = await fetch(`${baseUrl}${API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS}`, {
        method: 'OPTIONS',
        headers: { Origin: baseUrl },
      });
      expect(preflightRes.status).toBe(HTTP_STATUS.NO_CONTENT);
      expect(preflightRes.headers.get('access-control-allow-origin')).toBe(baseUrl);

      const crossOriginRes = await fetch(`${baseUrl}${API_ENDPOINTS.HEALTH}`, {
        headers: { Origin: 'https://evil.example' },
      });
      expect(crossOriginRes.status).toBe(HTTP_STATUS.FORBIDDEN);
      expect(crossOriginRes.headers.get('access-control-allow-origin')).toBeNull();
      expect(await crossOriginRes.json()).toMatchObject({ code: ERROR_CODES.FORBIDDEN });

      const tlsProxyOrigin = 'https://preview.example.com';
      const tlsProxyRes = await fetch(`${baseUrl}${API_ENDPOINTS.HEALTH}`, {
        headers: {
          Origin: tlsProxyOrigin,
          'X-Forwarded-Host': 'preview.example.com',
          'X-Forwarded-Proto': 'http',
        },
      });
      expect(tlsProxyRes.status).toBe(HTTP_STATUS.OK);
      expect(tlsProxyRes.headers.get('access-control-allow-origin')).toBe(tlsProxyOrigin);

      const downgradedRes = await fetch(`${baseUrl}${API_ENDPOINTS.HEALTH}`, {
        headers: {
          Origin: 'http://preview.example.com',
          'X-Forwarded-Host': 'preview.example.com',
          'X-Forwarded-Proto': 'https',
        },
      });
      expect(downgradedRes.status).toBe(HTTP_STATUS.FORBIDDEN);
    });
  });
});
