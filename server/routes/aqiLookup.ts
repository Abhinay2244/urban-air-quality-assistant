/**
 * @module server/routes/aqiLookup
 * Responsibility: Resolve live AQI from WAQI (with Open-Meteo 24h PM2.5 enrichment) or Open-Meteo fallback.
 * Must not parse Express Query strings or expose API keys.
 */
import type { Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../shared/constants/http.ts';
import type { Coordinates } from '../../shared/types/index.ts';
import { buildLocationWarning } from '../../shared/utils/locationValidation.ts';
import type { ServerEnvConfig } from '../lib/config.ts';
import { sendErrorResponse } from '../lib/errorResponse.ts';
import { fetchFromOpenMeteo } from '../providers/aqiProviders.ts';
import {
  fetchOpenMeteoHourlyByCity,
  fetchOpenMeteoHourlyByCoords,
} from '../providers/hourlyForecastProvider.ts';
import { DEFAULT_PROVIDER_DEPS, type ProviderDeps } from '../providers/providerDeps.ts';
import {
  type AqiLookupTarget,
  fetchFromWaqi,
  type LiveAqiPayload,
} from '../providers/waqiProvider.ts';

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
          ...(requestedCity !== undefined ? { requestedLabel: requestedCity } : {}),
        })
      : undefined);

  return {
    ...rest,
    ...(distanceWarning ? { locationWarning: distanceWarning } : {}),
    ...(hourlyPm25 ? { hourlyPm25 } : {}),
  };
}

/**
 * Resolves live AQI for a sanitized target via WAQI (when configured) or Open-Meteo and writes HTTP JSON.
 */
export async function resolveAndSendAqi(
  res: Response,
  target: AqiLookupTarget,
  config: ServerEnvConfig,
  deps: ProviderDeps = DEFAULT_PROVIDER_DEPS,
): Promise<void> {
  if (config.aqiApiKey) {
    const waqiResult = await fetchFromWaqi(target, config.aqiApiKey, deps);
    if (waqiResult) {
      const extra = target.coords
        ? {
            hourlyPm25: await fetchOpenMeteoHourlyByCoords(
              target.coords.latitude,
              target.coords.longitude,
              deps.fetch,
            ),
            coords: target.coords,
          }
        : await fetchOpenMeteoHourlyByCity(target.city, deps.fetch);
      res
        .status(HTTP_STATUS.OK)
        .json(serializeWaqiPayload(waqiResult, extra.hourlyPm25, extra.coords, target.city));
      return;
    }
  }

  const fallbackResult = await fetchFromOpenMeteo(target, deps);
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
}
