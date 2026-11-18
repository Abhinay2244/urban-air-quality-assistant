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
  MAX_RECOMMENDATIONS: 6,
  MIN_PM25_REDUCTION: 0,
  MAX_PM25_REDUCTION: 100,
} as const;

/**
 * Server and external API endpoint configuration.
 */
export const API_ENDPOINTS = {
  ASSISTANT_RECOMMENDATIONS: '/api/assistant/recommendations',
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
  INVALID_CITY: 'Please enter a valid city name between 2 and 80 characters.',
  CITY_NOT_FOUND: 'Could not find air quality monitoring coordinates for that city.',
  AQI_FETCH_FAILED: 'Unable to retrieve live air quality data right now. Please try again.',
  AI_REQUEST_FAILED: 'Unable to generate personalized recommendations right now.',
  MISSING_API_KEY:
    'Server Gemini API key is not configured. Check Settings > Secrets in AI Studio.',
  INVALID_REQUEST_BODY: 'Invalid profile or air quality payload provided.',
  NETWORK_ERROR: 'Network connection failed while contacting the service.',
} as const;
