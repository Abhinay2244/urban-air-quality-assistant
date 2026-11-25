/**
 * @module server/geminiHandler
 * Responsibility: Validate recommendation payloads, check cache, and run the ordered Gemini model chain.
 * Must not leak GEMINI_API_KEY, parse UI formatting, or apply client-side presentation logic.
 */
import { GoogleGenAI } from '@google/genai';
import type { Request, RequestHandler, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../src/constants/http.ts';
import { GEMINI_CONFIG, GEMINI_MODEL_CHAIN } from '../src/constants/server.ts';
import { parseAndValidateAssistantResponse } from '../src/utils/assistantParser.ts';
import { buildAssistantPrompt } from '../src/utils/promptBuilder.ts';
import { sanitizeAqiData } from '../src/utils/sanitizing.ts';
import { isRecord } from '../src/utils/typeGuards.ts';
import { validateAqiData, validateUserProfile } from '../src/utils/validation.ts';
import {
  isTimeoutError,
  logGeminiModelSuccess,
  logGeminiUpstreamError,
  mapGeminiUpstreamError,
  sendErrorResponse,
} from './errorResponse.ts';
import {
  buildRecommendationsCacheKey,
  createRecommendationsCache,
  type RecommendationsCache,
} from './geminiCache.ts';
import { classifyGeminiChainError, GeminiBusyError } from './geminiErrors.ts';
import {
  createTimeoutError,
  DEFAULT_GEMINI_TIMINGS,
  type GeminiChainTimings,
  invokeGeminiModel,
  waitForRetry,
} from './geminiTransport.ts';

/**
 * Invokes GEMINI_MODEL_CHAIN in order, retrying once on 503/429, skipping immediately on 404 or timeout,
 * and capping total elapsed time with totalTimeoutMs.
 */
export async function generateRecommendationsText(
  ai: GoogleGenAI,
  contents: string,
  timings: GeminiChainTimings = DEFAULT_GEMINI_TIMINGS,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(createTimeoutError()), timings.totalTimeoutMs);
  let lastError: unknown;
  let allModelsBusy = true;
  const call = (model: string): Promise<string> =>
    invokeGeminiModel(ai, model, contents, timings.perAttemptTimeoutMs, controller.signal);
  const classify = (err: unknown): 'skip' | 'busy' =>
    classifyGeminiChainError(err, controller.signal.aborted, createTimeoutError, isTimeoutError);

  try {
    for (const model of GEMINI_MODEL_CHAIN) {
      if (controller.signal.aborted) throw createTimeoutError();
      try {
        const text = await call(model);
        logGeminiModelSuccess(model);
        return text;
      } catch (firstError: unknown) {
        lastError = firstError;
        logGeminiUpstreamError('Gemini Upstream', model, firstError);
        if (classify(firstError) === 'skip') {
          allModelsBusy = false;
          continue;
        }
        await waitForRetry(timings.retryDelayMs, controller.signal);
        try {
          const retryText = await call(model);
          logGeminiModelSuccess(model);
          return retryText;
        } catch (retryError: unknown) {
          lastError = retryError;
          logGeminiUpstreamError('Gemini Retry', model, retryError);
          if (classify(retryError) === 'skip') allModelsBusy = false;
        }
      }
    }
    throw allModelsBusy ? new GeminiBusyError() : lastError;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Creates an Express handler for /api/assistant/recommendations backed by the given in-memory cache.
 */
export function createAssistantRecommendationsHandler(
  cache: RecommendationsCache = createRecommendationsCache(),
): RequestHandler {
  return async (req: Request, res: Response): Promise<void> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      sendErrorResponse(
        res,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.AI_SERVICE_ERROR,
        ERROR_MESSAGES.MISSING_API_KEY,
      );
      return;
    }

    const failBadRequest = (message: string): void =>
      sendErrorResponse(res, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, message);

    if (!isRecord(req.body)) {
      failBadRequest(ERROR_MESSAGES.INVALID_REQUEST_BODY);
      return;
    }

    const profileResult = validateUserProfile(req.body.profile);
    if (!profileResult.isValid || !validateAqiData(req.body.aqiData)) {
      failBadRequest(profileResult.error?.message ?? ERROR_MESSAGES.INVALID_REQUEST_BODY);
      return;
    }

    const sanitizedAqi = sanitizeAqiData(req.body.aqiData, profileResult.value.city);
    const cacheKey = buildRecommendationsCacheKey(profileResult.value, sanitizedAqi);
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
      const rawText = await generateRecommendationsText(
        ai,
        buildAssistantPrompt(profileResult.value, sanitizedAqi),
      );
      if (!parseAndValidateAssistantResponse(rawText).isFallback) {
        cache.set(cacheKey, rawText);
      }
      res.status(HTTP_STATUS.OK).json({ rawText });
    } catch (error: unknown) {
      const mapped = mapGeminiUpstreamError(error);
      sendErrorResponse(res, mapped.status, ERROR_CODES.AI_SERVICE_ERROR, mapped.message);
    }
  };
}
