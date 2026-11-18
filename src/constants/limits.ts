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
  WAQI_FEED: 'https://api.waqi.info/feed',
  GEOCODING: 'https://geocoding-api.open-meteo.com/v1/search',
  AIR_QUALITY: 'https://air-quality-api.open-meteo.com/v1/air-quality',
} as const;

/**
 * Gemini API model and server runtime configuration.
 */
export const GEMINI_CONFIG = {
  MODEL: 'gemini-4-hydrogen',
  USER_AGENT: 'aistudio-build',
  RESPONSE_MIME_TYPE: 'application/json',
  SERVER_PORT: 3000,
  SERVER_HOST: '0.0.0.0',
} as const;

/**
 * HTTP status codes referenced across client and server handlers.
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
} as const;

/**
 * Centralized user-friendly error messages.
 */
export const ERROR_MESSAGES = {
  INVALID_CITY: 'Enter a valid city name (2 to 80 characters, letters and spaces).',
  INVALID_MANUAL_AQI: 'Enter a numeric US AQI between 0 and 500.',
  CITY_NOT_FOUND: 'Could not find air quality monitoring coordinates for that city.',
  AQI_FETCH_FAILED:
    'Live air quality lookup failed. Enter the current AQI manually below to continue.',
  AI_REQUEST_FAILED: 'Unable to generate personalized recommendations right now.',
  MISSING_API_KEY:
    'Server Gemini API key is not configured. Check Settings > Secrets in AI Studio.',
  INVALID_REQUEST_BODY: 'Invalid profile or air quality payload provided.',
  NETWORK_ERROR: 'Network connection failed while contacting the service.',
} as const;
