import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createManualAqiData,
  fetchAqiDataByCity,
  fetchAqiDataByCoordinates,
} from '../../services/aqiService.ts';
import { AqiCategoryId, ErrorCode } from '../../types/index.ts';

describe('aqiService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('fetches live AQI data including >500 values, stationName, provider, pm10, and hourlyPm25', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            city: 'Delhi',
            country: 'India',
            stationName: 'Anand Vihar, Delhi',
            provider: 'waqi',
            aqi: 625,
            pm25: 395.4,
            pm10: 520.1,
            no2: 65.2,
            o3: 32.0,
            updatedAt: '2026-11-18T08:00',
            hourlyPm25: [
              { time: '2026-11-18T12:00', pm25: 110 },
              { time: '2026-11-18T13:00', pm25: 95 },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const data = await fetchAqiDataByCity('Delhi');
    expect(data.city).toBe('Delhi');
    expect(data.stationName).toBe('Anand Vihar, Delhi');
    expect(data.provider).toBe('waqi');
    expect(data.aqi).toBe(625);
    expect(data.category).toBe(AqiCategoryId.HAZARDOUS);
    expect(data.pm10).toBe(520.1);
    expect(data.hourlyPm25).toHaveLength(2);
    expect(data.source).toBe('live');
  });

  it('supports coordinate lookups via fetchAqiDataByCoordinates', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          city: 'Noida',
          country: 'India',
          stationName: 'Sector 62, Noida',
          provider: 'open-meteo',
          aqi: 175,
          pm25: 105,
          no2: 30,
          o3: 25,
          updatedAt: '2026-11-18T08:00',
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const data = await fetchAqiDataByCoordinates({ latitude: 28.53, longitude: 77.39 });
    expect(String(fetchMock.mock.calls[0][0])).toContain('lat=28.53&lon=77.39');
    expect(data.provider).toBe('open-meteo');
    expect(data.category).toBe(AqiCategoryId.UNHEALTHY);
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

    await expect(fetchAqiDataByCity('Delhi')).rejects.toMatchObject({
      code: ErrorCode.NETWORK_ERROR,
    });
    await expect(fetchAqiDataByCity('Delhi')).rejects.toBe(abortErr);
  });

  it('creates validated manual AQI data (0-500 limit) and rejects out-of-range manual values', () => {
    const manualWithoutPm10 = createManualAqiData('Lucknow', 220);
    expect(manualWithoutPm10.source).toBe('manual');
    expect(manualWithoutPm10.category).toBe(AqiCategoryId.VERY_UNHEALTHY);
    expect(manualWithoutPm10.pm10).toBeUndefined();

    const manualWithPm10 = createManualAqiData('Kanpur', 320, 180, 260);
    expect(manualWithPm10.category).toBe(AqiCategoryId.HAZARDOUS);
    expect(manualWithPm10.pm10).toBe(260);

    expect(() => createManualAqiData('Lucknow', 700)).toThrow();
    expect(() => createManualAqiData('Lucknow', 180, -10)).toThrow();
    expect(() => createManualAqiData('Lucknow', 180, 90, 2500)).toThrow();
  });

  it('throws clean AQI_FETCH_ERROR without raw SyntaxError when server returns invalid JSON on 200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(new Response('<html>502 Proxy</html>', { status: 200 })),
    );

    await expect(fetchAqiDataByCity('Noida')).rejects.toEqual({
      code: ErrorCode.AQI_FETCH_ERROR,
      message: expect.any(String),
    });
  });
});
