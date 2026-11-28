/**
 * @module server/routes/citiesHandler
 * Responsibility: Handle GET /api/cities autocomplete lookups filtered strictly to India.
 * Must not call Gemini or expose upstream errors/stack traces.
 */
import type { Request, RequestHandler, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../shared/constants/http.ts';
import { INPUT_LIMITS } from '../../shared/constants/limits.ts';
import { sanitizeText } from '../../shared/utils/sanitizing.ts';
import { isTimeoutError, logServerError, sendErrorResponse } from '../lib/errorResponse.ts';
import { getRequestId } from '../middleware/requestContext.ts';
import { searchIndianCities } from '../providers/hourlyForecastProvider.ts';
import {
  DEFAULT_PROVIDER_DEPS,
  type FetchFn,
  type ProviderDeps,
} from '../providers/providerDeps.ts';

/**
 * Queries Open-Meteo geocoding with countryCode=IN for Indian city autocomplete.
 */
async function handleIndianCitySearch(
  req: Request,
  res: Response,
  fetchFn: FetchFn = DEFAULT_PROVIDER_DEPS.fetch,
): Promise<void> {
  const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
  const query = sanitizeText(rawQuery, INPUT_LIMITS.MAX_CITY_LENGTH);
  if (query.length < INPUT_LIMITS.MIN_CITY_LENGTH) {
    sendErrorResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_MESSAGES.INVALID_CITY,
    );
    return;
  }

  try {
    const cities = await searchIndianCities(query, fetchFn);
    if (cities === null) {
      sendErrorResponse(
        res,
        HTTP_STATUS.BAD_GATEWAY,
        ERROR_CODES.AQI_FETCH_ERROR,
        ERROR_MESSAGES.AQI_FETCH_FAILED,
      );
      return;
    }
    res.status(HTTP_STATUS.OK).json({ cities });
  } catch (error: unknown) {
    logServerError('Cities Search Handler', error, getRequestId(res));
    const status = isTimeoutError(error) ? HTTP_STATUS.GATEWAY_TIMEOUT : HTTP_STATUS.BAD_GATEWAY;
    const message = isTimeoutError(error)
      ? ERROR_MESSAGES.UPSTREAM_TIMEOUT
      : ERROR_MESSAGES.AQI_FETCH_FAILED;
    sendErrorResponse(res, status, ERROR_CODES.AQI_FETCH_ERROR, message);
  }
}

/** Creates an Express handler for GET /api/cities with injected fetch dependency. */
export function createCitiesHandler(deps: ProviderDeps = DEFAULT_PROVIDER_DEPS): RequestHandler {
  return (req, res, next): void => {
    void handleIndianCitySearch(req, res, deps.fetch).catch(next);
  };
}
