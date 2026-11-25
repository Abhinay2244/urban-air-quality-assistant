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
 * Ordered Gemini model chain tried in priority order on transient busy or availability errors.
 */
export const GEMINI_MODEL_CHAIN = [
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
] as const;

/**
 * Gemini API payload formatting, retry delay, and total request timeout configuration.
 */
export const GEMINI_CONFIG = {
  USER_AGENT: 'aistudio-build',
  RESPONSE_MIME_TYPE: 'application/json',
  RETRY_DELAY_MS: 800,
  TOTAL_TIMEOUT_MS: 25_000,
} as const;
