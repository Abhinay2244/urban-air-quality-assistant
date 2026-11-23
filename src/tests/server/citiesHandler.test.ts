import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../server/app.ts';
import { API_ENDPOINTS, ERROR_CODES, HTTP_STATUS } from '../../constants/http.ts';
import { withEphemeralServer } from '../fixtures/serverHarness.ts';

const realFetch = globalThis.fetch;

describe('server citiesHandler (India-only city search)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('rejects short city search queries with 400', async () => {
    await withEphemeralServer(createApp, async (baseUrl) => {
      const res = await realFetch(`${baseUrl}${API_ENDPOINTS.CITIES_SEARCH}?q=A`);
      expect(res.status).toBe(HTTP_STATUS.BAD_REQUEST);
      expect(await res.json()).toMatchObject({ code: ERROR_CODES.VALIDATION_ERROR });
    });
  });

  it('queries Open-Meteo geocoding strictly with countryCode=IN and returns matching Indian cities', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
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
    vi.stubGlobal('fetch', fetchMock);

    await withEphemeralServer(createApp, async (baseUrl) => {
      const res = await realFetch(`${baseUrl}${API_ENDPOINTS.CITIES_SEARCH}?q=Noida`);
      expect(res.status).toBe(HTTP_STATUS.OK);
      expect(String(fetchMock.mock.calls[0][0])).toContain('countryCode=IN');
      expect(await res.json()).toMatchObject({
        cities: [{ name: 'Noida', admin1: 'Uttar Pradesh', country: 'India' }],
      });
    });
  });
});
