/**
 * @module server/routes/geminiHandler
 * Responsibility: Validate recommendation payloads, check cache, and run the ordered Gemini model chain.
 * Must not leak GEMINI_API_KEY, parse UI formatting, or apply client-side presentation logic.
 */
import { GoogleGenAI } from '@google/genai';
import type { Request, RequestHandler, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../../shared/constants/http.ts';
import { GEMINI_CONFIG, GEMINI_MODEL_CHAIN } from '../../shared/constants/server.ts';
import { parseAndValidateAssistantResponse } from '../../shared/utils/assistantParser.ts';
import { buildAssistantPrompt } from '../../shared/utils/promptBuilder.ts';
import { sanitizeAqiData } from '../../shared/utils/sanitizing.ts';
import { isRecord } from '../../shared/utils/typeGuards.ts';
import { validateAqiData, validateUserProfile } from '../../shared/utils/validation.ts';
import { serverConfig, type ServerEnvConfig } from '../lib/config.ts';
import { isTimeoutError, mapGeminiUpstreamError, sendErrorResponse } from '../lib/errorResponse.ts';
import { logger } from '../lib/logger.ts';
import { getRequestId } from '../middleware/requestContext.ts';
import {
  buildRecommendationsCacheKey,
  createRecommendationsCache,
  type RecommendationsCache,
} from '../providers/geminiCache.ts';
import { createTimeoutError, runSingleModelWithRetry } from '../providers/geminiChain.ts';
import { classifyGeminiChainError, GeminiBusyError } from '../providers/geminiErrors.ts';
import { DEFAULT_GEMINI_TIMINGS, type GeminiChainTimings } from '../providers/geminiTransport.ts';
import { type ClockFn, DEFAULT_PROVIDER_DEPS } from '../providers/providerDeps.ts';

/**
 * Invokes GEMINI_MODEL_CHAIN in order, retrying once on 503/429, skipping immediately on 404 or timeout,
 * logging answering model, retries, and fallbacks with requestId, and capping total elapsed time.
 */
export async function generateRecommendationsText(
  ai: GoogleGenAI,
  contents: string,
  timings: GeminiChainTimings = DEFAULT_GEMINI_TIMINGS,
  requestId?: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(createTimeoutError());
  }, timings.totalTimeoutMs);
  let lastError: unknown;
  let allModelsBusy = true;
  const classify = (err: unknown): 'skip' | 'busy' =>
    classifyGeminiChainError(err, controller.signal.aborted, createTimeoutError, isTimeoutError);

  try {
    for (let idx = 0; idx < GEMINI_MODEL_CHAIN.length; idx++) {
      if (controller.signal.aborted) throw createTimeoutError();
      const model = GEMINI_MODEL_CHAIN[idx];
      if (!model) continue;
      const outcome = await runSingleModelWithRetry({
        ai,
        model,
        nextModel: GEMINI_MODEL_CHAIN[idx + 1],
        contents,
        timings,
        signal: controller.signal,
        requestId,
        classify,
      });
      if (outcome.text !== undefined) return outcome.text;
      lastError = outcome.error;
      if (outcome.sawSkip) allModelsBusy = false;
    }
    throw allModelsBusy ? new GeminiBusyError() : lastError;
  } finally {
    clearTimeout(timer);
  }
}

interface RecommendationHandlerDeps {
  cache: RecommendationsCache;
  config: ServerEnvConfig;
  now: ClockFn;
}

async function handleAssistantRecommendations(
  req: Request,
  res: Response,
  deps: RecommendationHandlerDeps,
): Promise<void> {
  const { cache, config, now } = deps;
  const requestId = getRequestId(res);
  const apiKey = config.geminiApiKey;
  if (!apiKey) {
    logger.warn('Gemini endpoint unavailable: GEMINI_API_KEY is missing', { requestId });
    sendErrorResponse(
      res,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      ERROR_CODES.AI_SERVICE_ERROR,
      ERROR_MESSAGES.AI_SERVICE_BUSY,
    );
    return;
  }
  if (!isRecord(req.body)) {
    sendErrorResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      ERROR_MESSAGES.INVALID_REQUEST_BODY,
    );
    return;
  }
  const profileResult = validateUserProfile(req.body.profile);
  if (!profileResult.isValid || !validateAqiData(req.body.aqiData)) {
    const message = profileResult.error?.message ?? ERROR_MESSAGES.INVALID_REQUEST_BODY;
    sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, message);
    return;
  }
  const sanitizedAqi = sanitizeAqiData(req.body.aqiData, profileResult.value.city);
  const cacheKey = buildRecommendationsCacheKey(profileResult.value, sanitizedAqi, now);
  const cached = cache.get(cacheKey);
  if (cached !== null) {
    res.status(HTTP_STATUS.OK).json({ rawText: cached });
    return;
  }
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': GEMINI_CONFIG.USER_AGENT } },
    });
    const prompt = buildAssistantPrompt(profileResult.value, sanitizedAqi);
    const rawText = await generateRecommendationsText(ai, prompt, undefined, requestId);
    if (!parseAndValidateAssistantResponse(rawText).isFallback) cache.set(cacheKey, rawText);
    res.status(HTTP_STATUS.OK).json({ rawText });
  } catch (error: unknown) {
    const mapped = mapGeminiUpstreamError(error);
    sendErrorResponse(res, mapped.status, ERROR_CODES.AI_SERVICE_ERROR, mapped.message);
  }
}

/**
 * Creates an Express handler for /api/assistant/recommendations backed by config, cache, and clock.
 */
export function createAssistantRecommendationsHandler(
  cache?: RecommendationsCache,
  config: ServerEnvConfig = serverConfig,
  now: ClockFn = DEFAULT_PROVIDER_DEPS.now,
): RequestHandler {
  const resolvedCache = cache ?? createRecommendationsCache(undefined, undefined, now);
  return (req: Request, res: Response, next): void => {
    void handleAssistantRecommendations(req, res, { cache: resolvedCache, config, now }).catch(
      next,
    );
  };
}
