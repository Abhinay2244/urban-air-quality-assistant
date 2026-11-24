/**
 * @module server/aqiProviders
 * Responsibility: Fetch and normalize live Open-Meteo AQI payloads and re-export shared provider types.
 * Must not handle Express Request/Response objects or leak API tokens in logs.
 */
import { INDIA_GEO_BOUNDS } from '../src/constants/aqi.ts';
import { APP_TEXT } from '../src/constants/config.ts';
import { API_ENDPOINTS } from '../src/constants/http.ts';
import { INPUT_LIMITS } from '../src/constants/limits.ts';
import { DEFAULT_COUNTRY, SERVER_CONFIG } from '../src/constants/server.ts';
import { buildLocationWarning } from '../src/utils/locationValidation.ts';
import { sanitizeText } from '../src/utils/sanitizing.ts';
import { isRecord } from '../src/utils/typeGuards.ts';
import { parseHourlyPm25 } from './hourlyForecastProvider.ts';
import {
  type AqiLookupTarget,
  type LiveAqiPayload,
  parseJsonResponse,
  readFiniteMetric,
} from './waqiProvider.ts';

/** Queries Open-Meteo by coordinates or geocoded city (preferring India) for current + 24h hourly PM2.5. */
export async function fetchFromOpenMeteo(
  target: AqiLookupTarget,
): Promise<LiveAqiPayload | 'not_found' | null> {
  let coords = target.coords;
  let resolvedCity = target.city ?? APP_TEXT.DEFAULT_LOCATION_CITY;
  let country: string = coords ? INDIA_GEO_BOUNDS.COUNTRY_NAME : DEFAULT_COUNTRY;
  let countryCode: string | undefined;

  if (!coords) {
    const geoUrl = `${API_ENDPOINTS.GEOCODING}?name=${encodeURIComponent(resolvedCity)}&count=5&language=en&format=json`;
    const geoRaw = await parseJsonResponse(
      await fetch(geoUrl, { signal: AbortSignal.timeout(SERVER_CONFIG.PROVIDER_TIMEOUT_MS) }),
      'Open-Meteo Geocoding',
    );
    if (geoRaw === null) return null;
    const list =
      isRecord(geoRaw) && Array.isArray(geoRaw.results) ? geoRaw.results.filter(isRecord) : [];
    const loc = list.find((item) => item.country_code === INDIA_GEO_BOUNDS.COUNTRY_CODE) ?? list[0];
    if (!loc) return 'not_found';

    const lat =
      typeof loc.latitude === 'number' && Number.isFinite(loc.latitude) ? loc.latitude : undefined;
    const lon =
      typeof loc.longitude === 'number' && Number.isFinite(loc.longitude)
        ? loc.longitude
        : undefined;
    if (lat === undefined || lon === undefined) return 'not_found';
    coords = { latitude: lat, longitude: lon };
    resolvedCity = typeof loc.name === 'string' ? loc.name : resolvedCity;
    country = typeof loc.country === 'string' ? loc.country : DEFAULT_COUNTRY;
    countryCode = typeof loc.country_code === 'string' ? loc.country_code : undefined;
  }

  const aqiUrl = `${API_ENDPOINTS.AIR_QUALITY}?latitude=${coords.latitude}&longitude=${coords.longitude}&current=us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone&hourly=pm2_5&forecast_hours=${INPUT_LIMITS.HOURLY_FORECAST_HOURS}&timezone=auto`;
  const aqiRaw = await parseJsonResponse(
    await fetch(aqiUrl, { signal: AbortSignal.timeout(SERVER_CONFIG.PROVIDER_TIMEOUT_MS) }),
    'Open-Meteo Air Quality',
  );
  const current = isRecord(aqiRaw) && isRecord(aqiRaw.current) ? aqiRaw.current : undefined;
  const usAqi = readFiniteMetric(current, 'us_aqi');
  if (usAqi === undefined) return null;

  const pm10 = readFiniteMetric(current, 'pm10');
  const hourlyPm25 = parseHourlyPm25(aqiRaw);
  const cleanCity = sanitizeText(resolvedCity, INPUT_LIMITS.MAX_CITY_LENGTH);
  const safeCity =
    cleanCity.length >= INPUT_LIMITS.MIN_CITY_LENGTH ? cleanCity : APP_TEXT.DEFAULT_LOCATION_CITY;
  const stationName = sanitizeText(
    `${safeCity} (${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)})`,
    INPUT_LIMITS.MAX_TEXT_LENGTH,
  );
  const locationWarning = buildLocationWarning({
    resolvedPlace: country !== DEFAULT_COUNTRY ? `${safeCity}, ${country}` : stationName,
    country,
    countryCode,
    stationCoords: coords,
    requestedCoords: target.coords,
    requestedLabel: target.city,
  });

  return {
    city: safeCity,
    country,
    stationName,
    provider: 'open-meteo',
    ...(locationWarning ? { locationWarning } : {}),
    aqi: Math.round(usAqi),
    pm25: readFiniteMetric(current, 'pm2_5') ?? 0,
    ...(pm10 !== undefined ? { pm10 } : {}),
    no2: readFiniteMetric(current, 'nitrogen_dioxide') ?? 0,
    o3: readFiniteMetric(current, 'ozone') ?? 0,
    updatedAt: typeof current?.time === 'string' ? current.time : new Date().toISOString(),
    ...(hourlyPm25 ? { hourlyPm25 } : {}),
  };
}
