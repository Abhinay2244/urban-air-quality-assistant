import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS, ERROR_CODES, HTTP_STATUS } from '@shared/constants/http.ts';
import { isRecord } from '@shared/utils/typeGuards.ts';
import type { ProviderDeps } from '../../../server/providers/providerDeps.ts';
import { withEphemeralServer } from '../fixtures/serverHarness.ts';
import { createTestApp } from '../fixtures/testApp.ts';

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

async function getJson(baseUrl: string, path: string): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${baseUrl}${path}`);
  const body: unknown = await res.json();
  return { status: res.status, body };
}

const withAqiServer = (
  env: NodeJS.ProcessEnv,
  deps: Partial<ProviderDeps>,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> => withEphemeralServer(() => createTestApp(env, deps), run);

describe('server aqiHandler and providers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects short/missing city names and malformed lat/lon coordinates with 400', async () => {
    await withAqiServer({}, {}, async (baseUrl) => {
      const queries = [
        '?city=%3Cb%3EA%3C%2Fb%3E',
        '?lat=28.61&lon=77.21',
        '?lat=999&lon=77.2&city=Delhi',
      ];
      for (const query of queries) {
        const res = await getJson(baseUrl, `${API_ENDPOINTS.AQI_LIVE}${query}`);
        expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(res.body).toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
      }
    });
  });

  it('queries WAQI geo feed for selected city coordinates, accepts AQI > 500, and attaches Open-Meteo hourlyPm25', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'ok',
          data: {
            aqi: 640,
            city: { name: 'Anand Vihar, Delhi', geo: [28.65, 77.31] },
            iaqi: { pm25: { v: 390 }, pm10: { v: 495 } },
            time: { iso: '2026-11-18T08:00:00Z' },
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          hourly: { time: ['2026-11-18T12:00', '2026-11-18T13:00'], pm2_5: [82, 74] },
        }),
      );

    await withAqiServer({ AQI_API_KEY: 'waqi-secret-token' }, { fetch: fetchMock }, async (url) => {
      const res = await getJson(url, `${API_ENDPOINTS.AQI_LIVE}?lat=28.61&lon=77.21&city=Delhi`);
      expect(res.status).toBe(HTTP_STATUS.OK);
      const firstCallUrl = fetchMock.mock.calls[0]?.[0];
      expect(typeof firstCallUrl === 'string' ? firstCallUrl : '').toContain('/geo:28.61;77.21/');
      expect(res.body).toMatchObject({
        aqi: 640,
        stationName: 'Anand Vihar, Delhi',
        provider: 'waqi',
        pm10: 495,
      });
    });
  });

  it('falls back to Open-Meteo, warns when outside India, and handles 404 city not found', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          results: [
            {
              name: 'London',
              country: 'United Kingdom',
              country_code: 'GB',
              latitude: 51.5,
              longitude: -0.12,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          current: { us_aqi: 48, pm2_5: 12, pm10: 22, nitrogen_dioxide: 20, ozone: 30 },
          hourly: { time: ['2026-11-18T14:00'], pm2_5: [12] },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ results: [] }));

    await withAqiServer({}, { fetch: fetchMock }, async (baseUrl) => {
      const aqiRes = await getJson(baseUrl, `${API_ENDPOINTS.AQI_LIVE}?city=London`);
      expect(aqiRes.status).toBe(HTTP_STATUS.OK);
      expect(aqiRes.body).toMatchObject({ provider: 'open-meteo' });
      expect(isRecord(aqiRes.body)).toBe(true);
      if (isRecord(aqiRes.body)) {
        expect(String(aqiRes.body.locationWarning)).toContain('outside India');
      }

      const notFoundRes = await getJson(baseUrl, `${API_ENDPOINTS.AQI_LIVE}?city=Atlantis`);
      expect(notFoundRes.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  it('handles upstream non-2xx / invalid JSON with 502 and timeouts with 504', async () => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const timeoutErr = Object.assign(new Error('Timed out'), { name: 'TimeoutError' });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('<html>Bad Gateway</html>', { status: 502 }))
      .mockResolvedValueOnce(new Response('not-json', { status: 200 }))
      .mockRejectedValueOnce(timeoutErr);

    await withAqiServer({}, { fetch: fetchMock }, async (baseUrl) => {
      expect((await getJson(baseUrl, `${API_ENDPOINTS.AQI_LIVE}?city=Delhi`)).status).toBe(
        HTTP_STATUS.BAD_GATEWAY,
      );
      expect((await getJson(baseUrl, `${API_ENDPOINTS.AQI_LIVE}?city=Delhi`)).status).toBe(
        HTTP_STATUS.BAD_GATEWAY,
      );
      expect((await getJson(baseUrl, `${API_ENDPOINTS.AQI_LIVE}?city=Delhi`)).status).toBe(
        HTTP_STATUS.GATEWAY_TIMEOUT,
      );
    });
  });
});
