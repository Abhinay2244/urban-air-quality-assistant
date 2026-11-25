/**
 * @module server/geminiHandler
 * Responsibility: Validate recommendation request payloads and run the ordered Gemini model chain.
 * Must not leak GEMINI_API_KEY, parse UI formatting, or apply client-side presentation logic.
 */
import { GoogleGenAI } from '@google/genai';
import type { Request, Response } from 'express';
import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from '../src/constants/http.ts';
import { GEMINI_CONFIG, GEMINI_MODEL_CHAIN } from '../src/constants/server.ts';
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
import { GeminiBusyError, isModelUnavailableError, isTransientBusyError } from './geminiErrors.ts';
import { createTimeoutError, invokeGeminiModel, waitForRetry } from './geminiTransport.ts';

function classifyChainError(error: unknown, aborted: boolean): 'unavailable' | 'busy' {
  if (aborted) throw createTimeoutError();
  if (isTimeoutError(error)) throw error;
  if (isModelUnavailableError(error)) return 'unavailable';
  if (isTransientBusyError(error)) return 'busy';
  throw error;
}

/**
 * Invokes GEMINI_MODEL_CHAIN in order with single-retry on 503/429, immediate skip on 404,
 * and a total time cap across all attempts.
 */
export async function generateRecommendationsText(
  ai: GoogleGenAI,
  contents: string,
  timings: { retryDelayMs: number; totalTimeoutMs: number } = {
    retryDelayMs: GEMINI_CONFIG.RETRY_DELAY_MS,
    totalTimeoutMs: GEMINI_CONFIG.TOTAL_TIMEOUT_MS,
  },
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(createTimeoutError()), timings.totalTimeoutMs);
  let lastError: unknown;
  let allModelsBusy = true;

  try {
    for (const model of GEMINI_MODEL_CHAIN) {
      if (controller.signal.aborted) throw createTimeoutError();
      try {
        const text = await invokeGeminiModel(ai, model, contents, controller.signal);
        logGeminiModelSuccess(model);
        return text;
      } catch (firstError: unknown) {
        lastError = firstError;
        logGeminiUpstreamError('Gemini Upstream', model, firstError);
        if (classifyChainError(firstError, controller.signal.aborted) === 'unavailable') {
          allModelsBusy = false;
          continue;
        }
        await waitForRetry(timings.retryDelayMs, controller.signal);
        try {
          const retryText = await invokeGeminiModel(ai, model, contents, controller.signal);
          logGeminiModelSuccess(model);
          return retryText;
        } catch (retryError: unknown) {
          lastError = retryError;
          logGeminiUpstreamError('Gemini Retry', model, retryError);
          if (classifyChainError(retryError, controller.signal.aborted) === 'unavailable') {
            allModelsBusy = false;
          }
        }
      }
    }
    throw allModelsBusy ? new GeminiBusyError() : lastError;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Express handler calling Gemini on the server with runtime payload validation and safe error mapping.
 */
export async function handleAssistantRecommendations(req: Request, res: Response): Promise<void> {
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
    sendErrorResponse(
      res,
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      profileResult.error?.message ?? ERROR_MESSAGES.INVALID_REQUEST_BODY,
    );
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': GEMINI_CONFIG.USER_AGENT } },
    });

    const sanitizedAqi = sanitizeAqiData(req.body.aqiData, profileResult.value.city);
    const rawText = await generateRecommendationsText(
      ai,
      buildAssistantPrompt(profileResult.value, sanitizedAqi),
    );

    res.status(HTTP_STATUS.OK).json({ rawText });
  } catch (error: unknown) {
    const mapped = mapGeminiUpstreamError(error);
    sendErrorResponse(res, mapped.status, ERROR_CODES.AI_SERVICE_ERROR, mapped.message);
  }
}
