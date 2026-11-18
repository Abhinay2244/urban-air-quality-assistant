import type { Request, Response } from 'express';
import { ERROR_MESSAGES, HTTP_STATUS, INPUT_LIMITS } from '../src/constants/limits.ts';
import { sanitizeText } from '../src/utils/sanitizing.ts';
import { fetchFromOpenMeteo, fetchFromWaqi } from './aqiProviders.ts';

const PLACEHOLDER_KEY = 'MY_AQI_API_KEY';

/**
 * Express handler resolving live AQI using env-configured AQI_API_KEY (WAQI) or Open-Meteo.
 */
export async function handleLiveAqiLookup(req: Request, res: Response): Promise<void> {
  const rawCity = typeof req.query.city === 'string' ? req.query.city : '';
  const city = sanitizeText(rawCity, INPUT_LIMITS.MAX_CITY_LENGTH);
  if (city.length < INPUT_LIMITS.MIN_CITY_LENGTH) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      code: 'VALIDATION_ERROR',
      message: ERROR_MESSAGES.INVALID_CITY,
    });
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
      res.status(HTTP_STATUS.NOT_FOUND).json({
        code: 'CITY_NOT_FOUND',
        message: ERROR_MESSAGES.CITY_NOT_FOUND,
      });
      return;
    }

    if (!fallbackResult) {
      res.status(HTTP_STATUS.BAD_GATEWAY).json({
        code: 'AQI_FETCH_ERROR',
        message: ERROR_MESSAGES.AQI_FETCH_FAILED,
      });
      return;
    }

    res.status(HTTP_STATUS.OK).json(fallbackResult);
  } catch (error: unknown) {
    res.status(HTTP_STATUS.BAD_GATEWAY).json({
      code: 'AQI_FETCH_ERROR',
      message: ERROR_MESSAGES.AQI_FETCH_FAILED,
      details: error instanceof Error ? error.message : undefined,
    });
  }
}
