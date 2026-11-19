import http from 'http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../server/app.ts';
import { API_ENDPOINTS, ERROR_CODES, HTTP_STATUS } from '../../constants/http.ts';

interface LocalJsonResponse {
  status: number;
  body: unknown;
}

async function getLocalApi(path: string): Promise<LocalJsonResponse> {
  const app = await createApp();
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Expected TCP server address');
  }

  return new Promise<LocalJsonResponse>((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${address.port}${path}`, (res) => {
      let raw = '';
      res.on('data', (chunk: Buffer) => {
        raw += chunk.toString();
      });
      res.on('end', () => {
        server.close();
        resolve({ status: res.statusCode ?? 0, body: JSON.parse(raw) });
      });
    });
    req.on('error', (err) => {
      server.close();
      reject(err);
    });
  });
}

describe('server aqiHandler and providers', () => {
  const originalKey = process.env.AQI_API_KEY;

  afterEach(() => {
    process.env.AQI_API_KEY = originalKey;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sanitizes city input and rejects too-short names with 400', async () => {
    const res = await getLocalApi(`${API_ENDPOINTS.AQI_LIVE}?city=%3Cb%3EA%3C%2Fb%3E`);
    expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(res.body).toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
  });

  it('uses WAQI primary provider when AQI_API_KEY is configured', async () => {
    process.env.AQI_API_KEY = 'waqi-secret-token';
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'ok',
          data: {
            aqi: 184,
            city: { name: 'Lahore' },
            iaqi: { pm25: { v: 112 } },
            time: { iso: '2026-11-18T08:00:00Z' },
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await getLocalApi(`${API_ENDPOINTS.AQI_LIVE}?city=%20Lahore%3Cb%3E%3C%2Fb%3E%20`);
    expect(res.status).toBe(HTTP_STATUS.OK);
    expect(res.body).toMatchObject({ city: 'Lahore', aqi: 184, pm25: 112 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to Open-Meteo when AQI_API_KEY is unset and handles 404 city not found', async () => {
    delete process.env.AQI_API_KEY;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [{ name: 'Delhi', country: 'India', latitude: 28.6, longitude: 77.2 }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            current: { us_aqi: 222, pm2_5: 155, pm10: 210, nitrogen_dioxide: 45, ozone: 20 },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const okRes = await getLocalApi(`${API_ENDPOINTS.AQI_LIVE}?city=Delhi`);
    expect(okRes.status).toBe(HTTP_STATUS.OK);
    expect(okRes.body).toMatchObject({ city: 'Delhi', country: 'India', aqi: 222 });

    const notFoundRes = await getLocalApi(`${API_ENDPOINTS.AQI_LIVE}?city=Atlantis`);
    expect(notFoundRes.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(notFoundRes.body).toMatchObject({ code: ERROR_CODES.CITY_NOT_FOUND });
  });

  it('logs upstream non-2xx and handles invalid JSON with 502 and timeouts with 504', async () => {
    delete process.env.AQI_API_KEY;
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
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

    const nonOkRes = await getLocalApi(`${API_ENDPOINTS.AQI_LIVE}?city=Beijing`);
    expect(nonOkRes.status).toBe(HTTP_STATUS.BAD_GATEWAY);
    expect(stderrSpy).toHaveBeenCalled();

    const invalidJsonRes = await getLocalApi(`${API_ENDPOINTS.AQI_LIVE}?city=Beijing`);
    expect(invalidJsonRes.status).toBe(HTTP_STATUS.BAD_GATEWAY);

    const timeoutRes = await getLocalApi(`${API_ENDPOINTS.AQI_LIVE}?city=Beijing`);
    expect(timeoutRes.status).toBe(HTTP_STATUS.GATEWAY_TIMEOUT);
    expect(timeoutRes.body).toMatchObject({ code: ERROR_CODES.AQI_FETCH_ERROR });
  });
});
