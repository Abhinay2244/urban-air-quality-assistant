/**
 * @module server/aqiHandler
 * Responsibility: Validate live AQI route queries (city or lat/lon) and dispatch WAQI/Open-Meteo lookups.
 * Must not expose API keys in responses or implement low-level provider HTTP parsing.
 */
import type { Request, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../src/constants/http.ts';
import { INPUT_LIMITS } from '../src/constants/limits.ts';
import type { Coordinates } from '../src/types/index.ts';
import { buildLocationWarning } from '../src/utils/locationValidation.ts';
import { sanitizeText } from '../src/utils/sanitizing.ts';
import { fetchFromOpenMeteo } from './aqiProviders.ts';
import { isTimeoutError, logServerError, sendErrorResponse } from './errorResponse.ts';
import {
  fetchOpenMeteoHourlyByCity,
  fetchOpenMeteoHourlyByCoords,
} from './hourlyForecastProvider.ts';
import { fetchFromWaqi, type LiveAqiPayload } from './waqiProvider.ts';

const PLACEHOLDER_KEY = 'MY_AQI_API_KEY';

function parseCoordinateQuery(
  rawLat: unknown,
  rawLon: unknown,
): Coordinates | 'invalid' | undefined {
  const hasLat = typeof rawLat === 'string' && rawLat.trim() !== '';
  const hasLon = typeof rawLon === 'string' && rawLon.trim() !== '';
  if (!hasLat && !hasLon) return undefined;
  if (!hasLat || !hasLon) return 'invalid';

  const latitude = Number(rawLat);
  const longitude = Number(rawLon);
  const valid =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= INPUT_LIMITS.MIN_LATITUDE &&
    latitude <= INPUT_LIMITS.MAX_LATITUDE &&
    longitude >= INPUT_LIMITS.MIN_LONGITUDE &&
    longitude <= INPUT_LIMITS.MAX_LONGITUDE;
  return valid ? { latitude, longitude } : 'invalid';
}

function serializeWaqiPayload(
  waqiResult: LiveAqiPayload,
  hourlyPm25: LiveAqiPayload['hourlyPm25'],
  referenceCoords?: Coordinates,
  requestedCity?: string,
): Omit<LiveAqiPayload, 'stationCoords'> {
  const { stationCoords, ...rest } = waqiResult;
  const distanceWarning =
    rest.locationWarning ??
    (stationCoords && referenceCoords
      ? buildLocationWarning({
          resolvedPlace: rest.stationName ?? rest.city,
          stationCoords,
          requestedCoords: referenceCoords,
          requestedLabel: requestedCity,
        })
      : undefined);

  return {
    ...rest,
    ...(distanceWarning ? { locationWarning: distanceWarning } : {}),
    ...(hourlyPm25 ? { hourlyPm25 } : {}),
  };
}

/**
 * Express handler resolving live AQI using env-configured WAQI or Open-Meteo by city or coordinates.
 */
export async function handleLiveAqiLookup(req: Request, res: Response): Promise<void> {
  const coords = parseCoordinateQuery(req.query.lat, req.query.lon);
  if (coords === 'invalid') {
    sendErrorResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_MESSAGES.INVALID_COORDINATES,
    );
    return;
  }

  const rawCity = typeof req.query.city === 'string' ? req.query.city : '';
  const city = sanitizeText(rawCity, INPUT_LIMITS.MAX_CITY_LENGTH);
  if (!coords && city.length < INPUT_LIMITS.MIN_CITY_LENGTH) {
    sendErrorResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_MESSAGES.INVALID_CITY,
    );
    return;
  }

  const target = {
    ...(city.length >= INPUT_LIMITS.MIN_CITY_LENGTH ? { city } : {}),
    ...(coords ? { coords } : {}),
  };

  try {
    const apiKey = process.env.AQI_API_KEY;
    if (apiKey && apiKey !== PLACEHOLDER_KEY) {
      const waqiResult = await fetchFromWaqi(target, apiKey);
      if (waqiResult) {
        const extra = coords
          ? {
              hourlyPm25: await fetchOpenMeteoHourlyByCoords(coords.latitude, coords.longitude),
              coords,
            }
          : await fetchOpenMeteoHourlyByCity(city);
        res
          .status(HTTP_STATUS.OK)
          .json(
            serializeWaqiPayload(waqiResult, extra.hourlyPm25, extra.coords, city || undefined),
          );
        return;
      }
    }

    const fallbackResult = await fetchFromOpenMeteo(target);
    if (fallbackResult === 'not_found') {
      sendErrorResponse(
        res,
        HTTP_STATUS.NOT_FOUND,
        ERROR_CODES.CITY_NOT_FOUND,
        ERROR_MESSAGES.CITY_NOT_FOUND,
      );
      return;
    }
    if (!fallbackResult) {
      sendErrorResponse(
        res,
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.AQI_FETCH_ERROR,
        ERROR_MESSAGES.AQI_FETCH_FAILED,
      );
      return;
    }
    res.status(HTTP_STATUS.OK).json(fallbackResult);
  } catch (error: unknown) {
    logServerError('AQI Handler', error);
    const status = isTimeoutError(error) ? HTTP_STATUS.GATEWAY_TIMEOUT : HTTP_STATUS.BAD_GATEWAY;
    const message = isTimeoutError(error)
      ? ERROR_MESSAGES.UPSTREAM_TIMEOUT
      : ERROR_MESSAGES.AQI_FETCH_FAILED;
    sendErrorResponse(res, status, ERROR_CODES.AQI_FETCH_ERROR, message);
  }
}
