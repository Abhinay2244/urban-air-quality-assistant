/**
 * @module server/waqiProvider
 * Responsibility: Fetch live AQI payloads (including >500 values) from WAQI feeds and parse JSON responses.
 * Must not handle Express Request/Response objects or leak API tokens in logs.
 */
import { API_ENDPOINTS } from '../../shared/constants/http.ts';
import { SERVER_CONFIG } from '../../shared/constants/server.ts';
import { isRecord } from '../../shared/utils/typeGuards.ts';
import { logServerError } from '../lib/errorResponse.ts';
import { DEFAULT_PROVIDER_DEPS, type ProviderDeps } from './providerDeps.ts';
import {
  type AqiLookupTarget,
  type LiveAqiPayload,
  normalizeWaqiData,
  readFiniteMetric,
} from './waqiNormalize.ts';

export type { AqiLookupTarget, LiveAqiPayload };
export { readFiniteMetric };

/** Safely parses an upstream Response body as unknown JSON, logging non-OK/parse failures. */
export async function parseJsonResponse(res: Response, context: string): Promise<unknown> {
  if (!res.ok) {
    logServerError(context, new Error(`Upstream HTTP ${res.status}`));
    return null;
  }
  try {
    return await res.json();
  } catch (error: unknown) {
    logServerError(context, error);
    return null;
  }
}

/** Queries the WAQI feed API by coordinates (`geo:lat;lon`) or city when `AQI_API_KEY` is set. */
export async function fetchFromWaqi(
  target: AqiLookupTarget,
  apiKey: string,
  deps: ProviderDeps = DEFAULT_PROVIDER_DEPS,
): Promise<LiveAqiPayload | null> {
  const feedSegment = target.coords
    ? `geo:${target.coords.latitude};${target.coords.longitude}`
    : encodeURIComponent(target.city);
  const url = `${API_ENDPOINTS.WAQI_FEED}/${feedSegment}/?token=${encodeURIComponent(apiKey)}`;
  const res = await deps.fetch(url, {
    signal: AbortSignal.timeout(SERVER_CONFIG.PROVIDER_TIMEOUT_MS),
  });
  const raw = await parseJsonResponse(res, 'WAQI Provider');
  if (!isRecord(raw) || raw.status !== 'ok' || !isRecord(raw.data)) return null;
  // Why: Severe pollution episodes (e.g., Delhi stations) can report raw US-scale readings above 500;
  // we accept and display the uncapped reading rather than clamping or rejecting real telemetry.
  const aqi = readFiniteMetric(raw.data, 'aqi');
  return aqi === undefined ? null : normalizeWaqiData(raw.data, aqi, target, deps.now);
}
