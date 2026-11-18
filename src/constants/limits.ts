/**
 * Input validation limits for user-entered fields and AI outputs.
 */
export const INPUT_LIMITS = {
  MIN_CITY_LENGTH: 2,
  MAX_CITY_LENGTH: 80,
  MAX_TEXT_LENGTH: 500,
  MAX_SUMMARY_LENGTH: 400,
  MAX_RECOMMENDATION_TEXT_LENGTH: 350,
  MIN_RECOMMENDATIONS: 1,
  MAX_RECOMMENDATIONS: 8,
  MIN_PM25_REDUCTION: 0,
  MAX_PM25_REDUCTION: 100,
  MIN_AQI_VALUE: 0,
  MAX_AQI_VALUE: 500,
  MAX_PM25_VALUE: 1000,
  SUBMIT_COOLDOWN_SECONDS: 5,
  COOLDOWN_TICK_MS: 1000,
} as const;

/**
 * Server and external API endpoint configuration.
 */
export const API_ENDPOINTS = {
  ASSISTANT_RECOMMENDATIONS: '/api/assistant/recommendations',
  AQI_LIVE: '/api/aqi',
  API_PREFIX: '/api',
  WAQI_FEED: 'https://api.waqi.info/feed',
  GEOCODING: 'https://geocoding-api.open-meteo.com/v1/search',
  AIR_QUALITY: 'https://air-quality-api.open-meteo.com/v1/air-quality',
} as const;

/**
 * Server network binding, body limits, and upstream request timeout configuration.
 */
export const SERVER_CONFIG = {
  PORT: 3000,
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
 * Gemini API model and payload formatting configuration.
 */
export const GEMINI_CONFIG = {
  MODEL: 'gemini-4-hydrogen',
  USER_AGENT: 'aistudio-build',
  RESPONSE_MIME_TYPE: 'application/json',
} as const;

/**
 * HTTP status codes referenced across client and server handlers.
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Shared typed error codes used across server handlers, services, and UI.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CITY_NOT_FOUND: 'CITY_NOT_FOUND',
  AQI_FETCH_ERROR: 'AQI_FETCH_ERROR',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * Centralized user-friendly error messages.
 */
export const ERROR_MESSAGES = {
  INVALID_CITY: 'Enter a valid city name (2 to 80 characters, letters and spaces).',
  INVALID_MANUAL_AQI: 'Enter a numeric US AQI between 0 and 500.',
  INVALID_MANUAL_PM25: 'Enter an optional PM2.5 reading between 0 and 1000 ug/m3.',
  CITY_NOT_FOUND: 'Could not find air quality monitoring coordinates for that city.',
  AQI_FETCH_FAILED:
    'Live air quality lookup failed. Enter the current AQI manually below to continue.',
  AI_REQUEST_FAILED: 'Unable to generate personalized recommendations right now.',
  AI_AUTH_ERROR: 'Gemini API key was rejected. Check Settings > Secrets in AI Studio.',
  AI_QUOTA_EXCEEDED: 'Gemini API quota exceeded. Please try again shortly or check billing.',
  AI_MODEL_NOT_FOUND: 'Configured AI model is unavailable right now.',
  UPSTREAM_TIMEOUT: 'The upstream service timed out. Please try again.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a minute before trying again.',
  MISSING_API_KEY:
    'Server Gemini API key is not configured. Check Settings > Secrets in AI Studio.',
  INVALID_REQUEST_BODY: 'Invalid profile or air quality payload provided.',
  NETWORK_ERROR: 'Network connection failed while contacting the service.',
} as const;
