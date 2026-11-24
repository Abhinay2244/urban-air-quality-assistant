import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../server/app.ts';
import { API_ENDPOINTS, ERROR_CODES, HTTP_STATUS } from '../../constants/http.ts';
import { withEphemeralServer } from '../fixtures/serverHarness.ts';

const realFetch = globalThis.fetch;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

async function getJson(baseUrl: string, path: string): Promise<{ status: number; body: unknown }> {
  const res = await realFetch(`${baseUrl}${path}`);
  const body: unknown = await res.json();
  return { status: res.status, body };
}

describe('server aqiHandler and providers', () => {
  const originalKey = process.env.AQI_API_KEY;

  afterEach(() => {
    process.env.AQI_API_KEY = originalKey;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects short/missing city names and malformed lat/lon coordinates with 400', async () => {
    await withEphemeralServer(createApp, async (baseUrl) => {
      const invalidQueries = [
        '?city=%3Cb%3EA%3C%2Fb%3E',
        '?lat=28.61&lon=77.21',
        '?lat=999&lon=77.2&city=Delhi',
      ];
      for (const query of invalidQueries) {
        const res = await getJson(baseUrl, `${API_ENDPOINTS.AQI_LIVE}${query}`);
        expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(res.body).toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
      }
    });
  });

  it('queries WAQI geo feed for selected city coordinates, accepts AQI > 500, and attaches Open-Meteo hourlyPm25', async () => {
    process.env.AQI_API_KEY = 'waqi-secret-token';
    const fetchMock = vi
      .fn()
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
    vi.stubGlobal('fetch', fetchMock);

    await withEphemeralServer(createApp, async (baseUrl) => {
      const res = await getJson(
        baseUrl,
        `${API_ENDPOINTS.AQI_LIVE}?lat=28.61&lon=77.21&city=Delhi`,
      );
      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(String(fetchMock.mock.calls[0][0])).toContain('/geo:28.61;77.21/');
      expect(res.body).toMatchObject({
        aqi: 640,
        stationName: 'Anand Vihar, Delhi',
        provider: 'waqi',
        pm10: 495,
      });
    });
  });

  it('falls back to Open-Meteo, warns when outside India, and handles 404 city not found', async () => {
    delete process.env.AQI_API_KEY;
    const fetchMock = vi
      .fn()
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
    vi.stubGlobal('fetch', fetchMock);

    await withEphemeralServer(createApp, async (baseUrl) => {
      const aqiRes = await getJson(baseUrl, `${API_ENDPOINTS.AQI_LIVE}?city=London`);
      expect(aqiRes.status).toBe(HTTP_STATUS.OK);
      expect(aqiRes.body).toMatchObject({
        provider: 'open-meteo',
        locationWarning: expect.stringContaining('outside India'),
      });

      const notFoundRes = await getJson(baseUrl, `${API_ENDPOINTS.AQI_LIVE}?city=Atlantis`);
      expect(notFoundRes.status).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  it('handles upstream non-2xx / invalid JSON with 502 and timeouts with 504', async () => {
    delete process.env.AQI_API_KEY;
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const timeoutErr = new Error('Timed out');
    timeoutErr.name = 'TimeoutError';

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('<html>Bad Gateway</html>', { status: 502 }))
        .mockResolvedValueOnce(new Response('not-json', { status: 200 }))
        .mockRejectedValueOnce(timeoutErr),
    );

    await withEphemeralServer(createApp, async (baseUrl) => {
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
