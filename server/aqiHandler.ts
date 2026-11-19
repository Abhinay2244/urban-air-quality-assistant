/**
 * @module server/aqiHandler
 * Responsibility: Validate live AQI route queries and dispatch primary/fallback AQI provider lookups.
 * Must not expose API keys in responses or implement low-level provider HTTP parsing.
 */
import type { Request, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../src/constants/http.ts';
import { INPUT_LIMITS } from '../src/constants/limits.ts';
import { sanitizeText } from '../src/utils/sanitizing.ts';
import { fetchFromOpenMeteo, fetchFromWaqi } from './aqiProviders.ts';
import { isTimeoutError, logServerError, sendErrorResponse } from './errorResponse.ts';

const PLACEHOLDER_KEY = 'MY_AQI_API_KEY';

/**
 * Express handler resolving live AQI using env-configured AQI_API_KEY (WAQI) or Open-Meteo.
 */
export async function handleLiveAqiLookup(req: Request, res: Response): Promise<void> {
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

  try {
    const apiKey = process.env.AQI_API_KEY;
    if (apiKey && apiKey !== PLACEHOLDER_KEY) {
      const waqiResult = await fetchFromWaqi(city, apiKey);
      if (waqiResult) {
        res.status(HTTP_STATUS.OK).json(waqiResult);
        return;
      }
    }

    const fallbackResult = await fetchFromOpenMeteo(city);
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
