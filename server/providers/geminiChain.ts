/**
 * @module server/geminiChain
 * Responsibility: Execute a single Gemini model attempt with one delayed retry on transient busy errors.
 * Must not validate HTTP requests, manage caches, or expose API keys.
 */
import type { GoogleGenAI } from '@google/genai';
import {
  logGeminiAttemptOutcome,
  logGeminiModelFallback,
  logGeminiModelRetry,
  logGeminiModelSuccess,
} from './geminiLogging.ts';
import {
  createTimeoutError,
  type GeminiChainTimings,
  invokeGeminiModel,
  waitForRetry,
} from './geminiTransport.ts';

/** Outcome of trying a single model (plus optional retry) in the Gemini fallback chain. */
export interface ModelAttemptOutcome {
  text?: string;
  error?: unknown;
  sawSkip: boolean;
}

/** Options required to execute one model entry in the fallback chain. */
export interface SingleModelAttemptOptions {
  ai: GoogleGenAI;
  model: string;
  nextModel: string | undefined;
  contents: string;
  timings: GeminiChainTimings;
  signal: AbortSignal;
  requestId: string | undefined;
  classify: (err: unknown) => 'skip' | 'busy';
}

function classifyForChain(
  classify: (err: unknown) => 'skip' | 'busy',
  error: unknown,
): 'skip' | 'busy' | 'fatal' {
  try {
    return classify(error);
  } catch {
    return 'fatal';
  }
}

function handleAttemptFailure(
  context: string,
  error: unknown,
  opts: SingleModelAttemptOptions,
  allowBusyRecovery: boolean,
): 'skip' | 'busy' {
  const { model, nextModel, requestId, classify } = opts;
  const outcome = classifyForChain(classify, error);
  const recoverable =
    outcome !== 'fatal' && ((allowBusyRecovery && outcome === 'busy') || Boolean(nextModel));
  logGeminiAttemptOutcome({ context, model, error, recoverable, requestId });
  return classify(error);
}

async function executeRetryAttempt(
  invoke: () => Promise<string>,
  opts: SingleModelAttemptOptions,
): Promise<ModelAttemptOutcome> {
  const { model, nextModel, timings, signal, requestId } = opts;
  logGeminiModelRetry(model, timings.retryDelayMs, requestId);
  await waitForRetry(timings.retryDelayMs, signal);
  try {
    const retryText = await invoke();
    logGeminiModelSuccess(model, requestId);
    return { text: retryText, sawSkip: false };
  } catch (retryError: unknown) {
    const outcome = handleAttemptFailure('Gemini Retry', retryError, opts, false);
    if (nextModel) logGeminiModelFallback(model, nextModel, 'retry_exhausted', requestId);
    return { error: retryError, sawSkip: outcome === 'skip' };
  }
}

/**
 * Invokes a single Gemini model and retries once on transient busy/rate-limit errors,
 * returning early with `sawSkip: true` when a 404, unavailable model, or timeout occurs.
 */
export async function runSingleModelWithRetry(
  opts: SingleModelAttemptOptions,
): Promise<ModelAttemptOutcome> {
  const { ai, model, nextModel, contents, timings, signal, requestId } = opts;
  const invoke = (): Promise<string> =>
    invokeGeminiModel({
      ai,
      model,
      contents,
      perAttemptTimeoutMs: timings.perAttemptTimeoutMs,
      totalSignal: signal,
    });

  try {
    const text = await invoke();
    logGeminiModelSuccess(model, requestId);
    return { text, sawSkip: false };
  } catch (firstError: unknown) {
    const outcome = handleAttemptFailure('Gemini Upstream', firstError, opts, true);
    if (outcome === 'skip') {
      if (nextModel) logGeminiModelFallback(model, nextModel, 'skip', requestId);
      return { error: firstError, sawSkip: true };
    }
    return executeRetryAttempt(invoke, opts);
  }
}

export { createTimeoutError };
