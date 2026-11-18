import { API_ENDPOINTS, SERVER_CONFIG } from '../src/constants/limits.ts';
import { isRecord } from '../src/utils/validation.ts';

/**
 * Normalized air quality response returned by external AQI providers.
 */
export interface LiveAqiPayload {
  city: string;
  country: string;
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  updatedAt: string;
}

const DEFAULT_COUNTRY = 'Unknown';

function readNumber(record: Record<string, unknown> | undefined, key: string): number | undefined {
  if (!record) return undefined;
  const val = record[key];
  return typeof val === 'number' && Number.isFinite(val) ? val : undefined;
}

function readNestedMetric(iaqi: Record<string, unknown> | undefined, key: string): number {
  if (!iaqi) return 0;
  const metric = iaqi[key];
  return isRecord(metric) ? (readNumber(metric, 'v') ?? 0) : 0;
}

/**
 * Queries the WAQI feed API when an AQI_API_KEY is configured.
 */
export async function fetchFromWaqi(city: string, apiKey: string): Promise<LiveAqiPayload | null> {
  const url = `${API_ENDPOINTS.WAQI_FEED}/${encodeURIComponent(city)}/?token=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(SERVER_CONFIG.PROVIDER_TIMEOUT_MS) });
  if (!res.ok) return null;

  const raw: unknown = await res.json();
  if (!isRecord(raw) || raw.status !== 'ok' || !isRecord(raw.data)) return null;

  const aqi = readNumber(raw.data, 'aqi');
  if (aqi === undefined) return null;

  const cityObj = isRecord(raw.data.city) ? raw.data.city : undefined;
  const timeObj = isRecord(raw.data.time) ? raw.data.time : undefined;
  const iaqi = isRecord(raw.data.iaqi) ? raw.data.iaqi : undefined;

  return {
    city: typeof cityObj?.name === 'string' ? cityObj.name : city,
    country: DEFAULT_COUNTRY,
    aqi: Math.round(aqi),
    pm25: readNestedMetric(iaqi, 'pm25'),
    pm10: readNestedMetric(iaqi, 'pm10'),
    no2: readNestedMetric(iaqi, 'no2'),
    o3: readNestedMetric(iaqi, 'o3'),
    updatedAt: typeof timeObj?.iso === 'string' ? timeObj.iso : new Date().toISOString(),
  };
}

/**
 * Queries Open-Meteo geocoding and air quality endpoints as a keyless fallback.
 */
export async function fetchFromOpenMeteo(
  city: string,
): Promise<LiveAqiPayload | 'not_found' | null> {
  const signal = AbortSignal.timeout(SERVER_CONFIG.PROVIDER_TIMEOUT_MS);
  const geoUrl = `${API_ENDPOINTS.GEOCODING}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geoRes = await fetch(geoUrl, { signal });
  if (!geoRes.ok) return null;

  const geoRaw: unknown = await geoRes.json();
  const loc = isRecord(geoRaw) && Array.isArray(geoRaw.results) ? geoRaw.results[0] : undefined;
  if (!isRecord(loc)) return 'not_found';

  const lat = readNumber(loc, 'latitude');
  const lon = readNumber(loc, 'longitude');
  if (lat === undefined || lon === undefined) return 'not_found';

  const aqiUrl = `${API_ENDPOINTS.AIR_QUALITY}?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone`;
  const aqiRes = await fetch(aqiUrl, {
    signal: AbortSignal.timeout(SERVER_CONFIG.PROVIDER_TIMEOUT_MS),
  });
  if (!aqiRes.ok) return null;

  const aqiRaw: unknown = await aqiRes.json();
  const current = isRecord(aqiRaw) && isRecord(aqiRaw.current) ? aqiRaw.current : undefined;
  const usAqi = readNumber(current, 'us_aqi');
  if (usAqi === undefined) return null;

  return {
    city: typeof loc.name === 'string' ? loc.name : city,
    country: typeof loc.country === 'string' ? loc.country : DEFAULT_COUNTRY,
    aqi: Math.round(usAqi),
    pm25: readNumber(current, 'pm2_5') ?? 0,
    pm10: readNumber(current, 'pm10') ?? 0,
    no2: readNumber(current, 'nitrogen_dioxide') ?? 0,
    o3: readNumber(current, 'ozone') ?? 0,
    updatedAt: typeof current?.time === 'string' ? current.time : new Date().toISOString(),
  };
}
