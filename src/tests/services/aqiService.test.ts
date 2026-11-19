import { afterEach, describe, expect, it, vi } from 'vitest';
import { createManualAqiData, fetchAqiDataByCity } from '../../services/aqiService.ts';
import { AqiCategoryId, ErrorCode } from '../../types/index.ts';

describe('aqiService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

    const data = await fetchAqiDataByCity('New Delhi');
    expect(data.city).toBe('New Delhi');
    expect(data.country).toBe('India');
    expect(data.aqi).toBe(245);
    expect(data.source).toBe('live');
    expect(data.category).toBe(AqiCategoryId.VERY_UNHEALTHY);
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

    await expect(fetchAqiDataByCity('AtlantisXYZ')).rejects.toMatchObject({
      code: ErrorCode.CITY_NOT_FOUND,
    });
  });

  it('emits NETWORK_ERROR when fetch rejects with a TypeError and rethrows AbortError', async () => {
    const abortErr = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockRejectedValueOnce(abortErr),
    );

    await expect(fetchAqiDataByCity('New Delhi')).rejects.toMatchObject({
      code: ErrorCode.NETWORK_ERROR,
    });
    await expect(fetchAqiDataByCity('New Delhi')).rejects.toBe(abortErr);
  });

  it('creates validated manual AQI data and rejects out-of-range AQI or PM2.5 inputs', () => {
    const manual = createManualAqiData('Lahore', 220);
    expect(manual.source).toBe('manual');
    expect(manual.category).toBe(AqiCategoryId.VERY_UNHEALTHY);
    expect(() => createManualAqiData('Lahore', 700)).toThrow();
    expect(() => createManualAqiData('Lahore', 180, -10)).toThrow();
  });

  it('throws clean AQI_FETCH_ERROR without raw SyntaxError when server returns invalid JSON on 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response('<html>502 Proxy</html>', { status: 200 })),
    );

    await expect(fetchAqiDataByCity('Lahore')).rejects.toEqual({
      code: ErrorCode.AQI_FETCH_ERROR,
      message: expect.any(String),
    });
  });
});
