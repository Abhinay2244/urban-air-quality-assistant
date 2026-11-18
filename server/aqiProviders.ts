import { API_ENDPOINTS } from '../src/constants/limits.ts';

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

interface WaqiResponse {
  status?: string;
  data?: {
    aqi?: number;
    city?: { name?: string };
    time?: { iso?: string };
    iaqi?: {
      pm25?: { v?: number };
      pm10?: { v?: number };
      no2?: { v?: number };
      o3?: { v?: number };
    };
  };
}

interface GeocodingResponse {
  results?: Array<{ name?: string; country?: string; latitude?: number; longitude?: number }>;
}

interface OpenMeteoAqiResponse {
  current?: {
    time?: string;
    us_aqi?: number;
    pm2_5?: number;
    pm10?: number;
    nitrogen_dioxide?: number;
    ozone?: number;
  };
}

const DEFAULT_COUNTRY = 'Unknown';

/**
 * Queries the WAQI feed API when an AQI_API_KEY is configured.
 */
export async function fetchFromWaqi(city: string, apiKey: string): Promise<LiveAqiPayload | null> {
  const url = `${API_ENDPOINTS.WAQI_FEED}/${encodeURIComponent(city)}/?token=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const payload = (await res.json()) as WaqiResponse;
  if (payload.status !== 'ok' || typeof payload.data?.aqi !== 'number') {
    return null;
  }

  return {
    city: payload.data.city?.name ?? city,
    country: DEFAULT_COUNTRY,
    aqi: Math.round(payload.data.aqi),
    pm25: payload.data.iaqi?.pm25?.v ?? 0,
    pm10: payload.data.iaqi?.pm10?.v ?? 0,
    no2: payload.data.iaqi?.no2?.v ?? 0,
    o3: payload.data.iaqi?.o3?.v ?? 0,
    updatedAt: payload.data.time?.iso ?? new Date().toISOString(),
  };
}

/**
 * Queries Open-Meteo geocoding and air quality endpoints as a keyless fallback.
 */
export async function fetchFromOpenMeteo(
  city: string,
): Promise<LiveAqiPayload | 'not_found' | null> {
  const geoUrl = `${API_ENDPOINTS.GEOCODING}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) return null;

  const geoData = (await geoRes.json()) as GeocodingResponse;
  const loc = geoData.results?.[0];
  if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
    return 'not_found';
  }

  const aqiUrl = `${API_ENDPOINTS.AIR_QUALITY}?latitude=${loc.latitude}&longitude=${loc.longitude}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone`;
  const aqiRes = await fetch(aqiUrl);
  if (!aqiRes.ok) return null;

  const aqiData = (await aqiRes.json()) as OpenMeteoAqiResponse;
  if (typeof aqiData.current?.us_aqi !== 'number') return null;

  return {
    city: loc.name ?? city,
    country: loc.country ?? DEFAULT_COUNTRY,
    aqi: Math.round(aqiData.current.us_aqi),
    pm25: aqiData.current.pm2_5 ?? 0,
    pm10: aqiData.current.pm10 ?? 0,
    no2: aqiData.current.nitrogen_dioxide ?? 0,
    o3: aqiData.current.ozone ?? 0,
    updatedAt: aqiData.current.time ?? new Date().toISOString(),
  };
}
