import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAQIDataByCity } from '../../services/aqiService.ts';
import { AQICategoryId, ErrorCode } from '../../types/index.ts';

describe('aqiService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches geocoding coordinates and live AQI data for a valid city', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [{ name: 'New Delhi', country: 'India', latitude: 28.61, longitude: 77.2 }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            current: {
              time: '2026-11-18T08:00',
              us_aqi: 245,
              pm2_5: 195.4,
              pm10: 290.1,
              nitrogen_dioxide: 65.2,
              ozone: 32.0,
            },
          }),
          { status: 200 },
        ),
      );

    vi.stubGlobal('fetch', fetchMock);

    const data = await fetchAQIDataByCity('New Delhi');
    expect(data.city).toBe('New Delhi');
    expect(data.country).toBe('India');
    expect(data.aqi).toBe(245);
    expect(data.category).toBe(AQICategoryId.VERY_UNHEALTHY);
  });

  it('throws a typed CITY_NOT_FOUND error when geocoding returns no matches', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 })),
    );

    await expect(fetchAQIDataByCity('AtlantisXYZ')).rejects.toMatchObject({
      code: ErrorCode.CITY_NOT_FOUND,
    });
  });
});
