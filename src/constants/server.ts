/**
 * @module constants/server
 * Responsibility: Centralize Express server, security header, rate-limit, and Gemini runtime config.
 * Must not contain secrets, API keys, Express middleware logic, or browser/UI references.
 */

/**
 * Default fallback country label shared by client display and server AQI providers.
 */
export const DEFAULT_COUNTRY = 'Unknown';

/**
 * Server network binding, body limits, and upstream request timeout configuration.
 */
export const SERVER_CONFIG = {
  PORT: 3000,
  MAX_PORT: 65535,
  HOST: '0.0.0.0',
  PROVIDER_TIMEOUT_MS: 8000,
  REQUEST_TIMEOUT_MS: 60_000,
  JSON_BODY_LIMIT: '16kb',
} as const;

/**
 * Per-IP in-memory rate limit parameters for API routes.
 */
export const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 60_000,
  MAX_REQUESTS: 30,
  MS_PER_SECOND: 1000,
  MAX_TRACKED_IPS: 1000,
} as const;

/**
 * HTTP security header values and Content-Security-Policy rules for Vite builds.
 */
export const SECURITY_HEADERS = {
  CONTENT_TYPE_OPTIONS: 'nosniff',
  FRAME_OPTIONS: 'SAMEORIGIN',
  REFERRER_POLICY: 'strict-origin-when-cross-origin',
  PROD_CSP:
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'",
  DEV_CSP:
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ws: wss:; object-src 'none'; base-uri 'self'",
} as const;

/**
 * Ordered Gemini model chain tried in priority order on transient busy, timeout, or availability errors.
 */
export const GEMINI_MODEL_CHAIN = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash-lite',
] as const;

/**
 * Gemini API payload formatting, output budget, retry delay, and timeout configuration.
 */
export const GEMINI_CONFIG = {
  USER_AGENT: 'aistudio-build',
  RESPONSE_MIME_TYPE: 'application/json',
  MAX_OUTPUT_TOKENS: 2048,
  RETRY_DELAY_MS: 800,
  PER_ATTEMPT_TIMEOUT_MS: 20_000,
  TOTAL_TIMEOUT_MS: 45_000,
} as const;

/**
 * Bounded in-memory cache configuration for validated non-fallback Gemini recommendations.
 */
export const GEMINI_CACHE_CONFIG = {
  TTL_MS: 10 * 60 * 1000,
  MAX_ENTRIES: 100,
  AQI_BUCKET_SIZE: 10,
} as const;
