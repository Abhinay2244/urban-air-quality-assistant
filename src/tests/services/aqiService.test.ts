import { afterEach, describe, expect, it, vi } from 'vitest';
import { createManualAQIData, fetchAQIDataByCity } from '../../services/aqiService.ts';
import { AQICategoryId, ErrorCode } from '../../types/index.ts';

describe('aqiService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches live AQI data from the server proxy for a valid city', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            city: 'New Delhi',
            country: 'India',
            aqi: 245,
            pm25: 195.4,
            pm10: 290.1,
            no2: 65.2,
            o3: 32.0,
            updatedAt: '2026-11-18T08:00',
          }),
          { status: 200 },
        ),
      ),
    );

    const data = await fetchAQIDataByCity('New Delhi');
    expect(data.city).toBe('New Delhi');
    expect(data.country).toBe('India');
    expect(data.aqi).toBe(245);
    expect(data.source).toBe('live');
    expect(data.category).toBe(AQICategoryId.VERY_UNHEALTHY);
  });

  it('throws a typed CITY_NOT_FOUND error when the AQI proxy returns 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ code: ErrorCode.CITY_NOT_FOUND, message: 'City not found' }),
            { status: 404 },
          ),
        ),
    );

    await expect(fetchAQIDataByCity('AtlantisXYZ')).rejects.toMatchObject({
      code: ErrorCode.CITY_NOT_FOUND,
    });
  });

  it('creates validated manual AQI data and rejects out-of-range inputs', () => {
    const manual = createManualAQIData('Lahore', 220);
    expect(manual.source).toBe('manual');
    expect(manual.category).toBe(AQICategoryId.VERY_UNHEALTHY);
    expect(() => createManualAQIData('Lahore', 700)).toThrow();
  });
});
