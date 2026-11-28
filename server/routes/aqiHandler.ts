/**
 * @module server/routes/aqiHandler
 * Responsibility: Validate live AQI route queries (city or lat/lon) and dispatch AQI lookup resolution.
 * Must not expose API keys in responses or implement low-level provider HTTP parsing.
 */
import type { Request, RequestHandler, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../shared/constants/http.ts';
import { INPUT_LIMITS } from '../../shared/constants/limits.ts';
import type { Coordinates } from '../../shared/types/index.ts';
import { sanitizeText } from '../../shared/utils/sanitizing.ts';
import { serverConfig, type ServerEnvConfig } from '../lib/config.ts';
import { isTimeoutError, logServerError, sendErrorResponse } from '../lib/errorResponse.ts';
import { getRequestId } from '../middleware/requestContext.ts';
import { DEFAULT_PROVIDER_DEPS, type ProviderDeps } from '../providers/providerDeps.ts';
import type { AqiLookupTarget } from '../providers/waqiProvider.ts';
import { resolveAndSendAqi } from './aqiLookup.ts';

type CoordinateQueryParseResult =
  { status: 'none' } | { status: 'invalid' } | { status: 'valid'; coords: Coordinates };

function isWithinCoordinateBounds(latitude: number, longitude: number): boolean {
  const latOk =
    Number.isFinite(latitude) &&
    latitude >= INPUT_LIMITS.MIN_LATITUDE &&
    latitude <= INPUT_LIMITS.MAX_LATITUDE;
  const lonOk =
    Number.isFinite(longitude) &&
    longitude >= INPUT_LIMITS.MIN_LONGITUDE &&
    longitude <= INPUT_LIMITS.MAX_LONGITUDE;
  return latOk && lonOk;
}

function parseCoordinateQuery(rawLat: unknown, rawLon: unknown): CoordinateQueryParseResult {
  const hasLat = typeof rawLat === 'string' && rawLat.trim() !== '';
  const hasLon = typeof rawLon === 'string' && rawLon.trim() !== '';
  if (!hasLat && !hasLon) return { status: 'none' };
  if (!hasLat || !hasLon) return { status: 'invalid' };
  const latitude = Number(rawLat);
  const longitude = Number(rawLon);
  return isWithinCoordinateBounds(latitude, longitude)
    ? { status: 'valid', coords: { latitude, longitude } }
    : { status: 'invalid' };
}

async function handleLiveAqiRequest(
  req: Request,
  res: Response,
  config: ServerEnvConfig,
  deps: ProviderDeps,
): Promise<void> {
  const requestId = getRequestId(res);
  const coordResult = parseCoordinateQuery(req.query.lat, req.query.lon);
  if (coordResult.status === 'invalid') {
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
  if (city.length < INPUT_LIMITS.MIN_CITY_LENGTH) {
    sendErrorResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_MESSAGES.INVALID_CITY,
    );
    return;
  }

  const target: AqiLookupTarget =
    coordResult.status === 'valid' ? { city, coords: coordResult.coords } : { city };

  try {
    await resolveAndSendAqi(res, target, config, deps);
  } catch (error: unknown) {
    logServerError('AQI Handler', error, requestId);
    const status = isTimeoutError(error) ? HTTP_STATUS.GATEWAY_TIMEOUT : HTTP_STATUS.BAD_GATEWAY;
    const message = isTimeoutError(error)
      ? ERROR_MESSAGES.UPSTREAM_TIMEOUT
      : ERROR_MESSAGES.AQI_FETCH_FAILED;
    sendErrorResponse(res, status, ERROR_CODES.AQI_FETCH_ERROR, message);
  }
}

/**
 * Creates an Express handler resolving live AQI using config-provided WAQI key or Open-Meteo.
 */
export function createLiveAqiHandler(
  config: ServerEnvConfig = serverConfig,
  deps: ProviderDeps = DEFAULT_PROVIDER_DEPS,
): RequestHandler {
  return (req: Request, res: Response, next): void => {
    void handleLiveAqiRequest(req, res, config, deps).catch(next);
  };
}
