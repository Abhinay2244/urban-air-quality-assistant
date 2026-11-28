import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ENDPOINTS, ERROR_CODES, HTTP_STATUS } from '@shared/constants/http.ts';
import {
  fetchOpenMeteoHourlyByCity,
  fetchOpenMeteoHourlyByCoords,
} from '../../../server/providers/hourlyForecastProvider.ts';
import { withEphemeralServer } from '../fixtures/serverHarness.ts';
import { createTestApp } from '../fixtures/testApp.ts';

describe('server citiesHandler (India-only city search)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects short city search queries with 400', async () => {
    await withEphemeralServer(
      () => createTestApp(),
      async (baseUrl) => {
        const res = await fetch(`${baseUrl}${API_ENDPOINTS.CITIES_SEARCH}?q=A`);
        expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await res.json()).toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
      },
    );
  });

  it('queries Open-Meteo geocoding strictly with countryCode=IN and returns matching Indian cities', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              name: 'Noida',
              admin1: 'Uttar Pradesh',
              country: 'India',
              country_code: 'IN',
              latitude: 28.5355,
              longitude: 77.391,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await withEphemeralServer(
      () => createTestApp({}, { fetch: fetchMock }),
      async (baseUrl) => {
        const res = await fetch(`${baseUrl}${API_ENDPOINTS.CITIES_SEARCH}?q=Noida`);
        expect(res.status).toBe(HTTP_STATUS.OK);
        const firstCallUrl = fetchMock.mock.calls[0]?.[0];
        expect(typeof firstCallUrl === 'string' ? firstCallUrl : '').toContain('countryCode=IN');
        expect(await res.json()).toMatchObject({
          cities: [{ name: 'Noida', admin1: 'Uttar Pradesh', country: 'India' }],
        });
      },
    );
  });

  it('returns 502 when upstream geocoding fails and 504 when it times out', async () => {
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const timeoutErr = Object.assign(new Error('Timed out'), { name: 'TimeoutError' });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('bad gateway', { status: 502 }))
      .mockRejectedValueOnce(new Error('network boom'))
      .mockRejectedValueOnce(timeoutErr);

    await withEphemeralServer(
      () => createTestApp({}, { fetch: fetchMock }),
      async (baseUrl) => {
        const badRes = await fetch(`${baseUrl}${API_ENDPOINTS.CITIES_SEARCH}?q=Delhi`);
        expect(badRes.status).toBe(HTTP_STATUS.BAD_GATEWAY);

        const errRes = await fetch(`${baseUrl}${API_ENDPOINTS.CITIES_SEARCH}?q=Delhi`);
        expect(errRes.status).toBe(HTTP_STATUS.BAD_GATEWAY);

        const timeoutRes = await fetch(`${baseUrl}${API_ENDPOINTS.CITIES_SEARCH}?q=Delhi`);
        expect(timeoutRes.status).toBe(HTTP_STATUS.GATEWAY_TIMEOUT);
      },
    );
  });

  it('covers fetchOpenMeteoHourlyByCity and fetchOpenMeteoHourlyByCoords fallback branches', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('fail', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }))
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('hourly offline'));

    expect(await fetchOpenMeteoHourlyByCity('Delhi', fetchMock)).toEqual({});
    expect(await fetchOpenMeteoHourlyByCity('Nowhere', fetchMock)).toEqual({});
    expect(await fetchOpenMeteoHourlyByCity('Delhi', fetchMock)).toEqual({});
    expect(await fetchOpenMeteoHourlyByCoords(28.6, 77.2, fetchMock)).toBeUndefined();
  });
});
