/**
 * @module server/citiesHandler
 * Responsibility: Handle GET /api/cities autocomplete lookups filtered strictly to India.
 * Must not call Gemini or expose upstream errors/stack traces.
 */
import type { Request, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../src/constants/http.ts';
import { INPUT_LIMITS } from '../src/constants/limits.ts';
import { sanitizeText } from '../src/utils/sanitizing.ts';
import { isTimeoutError, logServerError, sendErrorResponse } from './errorResponse.ts';
import { searchIndianCities } from './hourlyForecastProvider.ts';

/**
 * Express handler querying Open-Meteo geocoding with countryCode=IN for Indian city search.
 */
export async function handleIndianCitySearch(req: Request, res: Response): Promise<void> {
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
    const cities = await searchIndianCities(query);
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
    logServerError('Cities Search Handler', error);
    const status = isTimeoutError(error) ? HTTP_STATUS.GATEWAY_TIMEOUT : HTTP_STATUS.BAD_GATEWAY;
    const message = isTimeoutError(error)
      ? ERROR_MESSAGES.UPSTREAM_TIMEOUT
      : ERROR_MESSAGES.AQI_FETCH_FAILED;
    sendErrorResponse(res, status, ERROR_CODES.AQI_FETCH_ERROR, message);
  }
}
