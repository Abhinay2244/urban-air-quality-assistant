/**
 * @module constants/http
 * Responsibility: Define shared API endpoints, HTTP status codes, and typed error contracts.
 * Must not contain runtime logic, secrets, or browser/DOM dependencies.
 */

/**
 * Server and external API endpoint configuration.
 */
export const API_ENDPOINTS = {
  ASSISTANT_RECOMMENDATIONS: '/api/assistant/recommendations',
  AQI_LIVE: '/api/aqi',
  CITIES_SEARCH: '/api/cities',
  HEALTH: '/api/health',
  API_PREFIX: '/api',
  WAQI_FEED: 'https://api.waqi.info/feed',
  GEOCODING: 'https://geocoding-api.open-meteo.com/v1/search',
  AIR_QUALITY: 'https://air-quality-api.open-meteo.com/v1/air-quality',
} as const;

/**
 * HTTP status codes referenced across client and server handlers.
 */
export const HTTP_STATUS = {
  OK: 200,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  REQUEST_TIMEOUT: 408,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Shared typed error codes used across server handlers, services, and UI.
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
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
  INVALID_COORDINATES:
    'Provide valid latitude (-90 to 90) and longitude (-180 to 180) coordinates.',
  INVALID_MANUAL_AQI: 'Enter a numeric AQI between 0 and 500.',
  INVALID_MANUAL_PM25: 'Enter an optional PM2.5 reading between 0 and 1000 ug/m3.',
  INVALID_MANUAL_PM10: 'Enter an optional PM10 reading between 0 and 2000 ug/m3.',
  CITY_NOT_FOUND: 'Could not find air quality monitoring coordinates for that city.',
  AQI_FETCH_FAILED:
    'Live air quality lookup failed. Enter the current AQI manually below to continue.',
  AI_REQUEST_FAILED: 'Unable to generate personalized recommendations right now.',
  AI_AUTH_ERROR: 'Gemini API key was rejected. Check Settings > Secrets in AI Studio.',
  AI_QUOTA_EXCEEDED: 'Gemini API quota exceeded. Please try again shortly or check billing.',
  AI_MODEL_NOT_FOUND: 'Configured AI model is unavailable right now.',
  AI_SERVICE_BUSY: 'The AI service is busy. Please try again in a moment.',
  INVALID_AI_REQUEST:
    'The air quality request could not be processed by the AI service. Please verify your location and AQI values.',
  UPSTREAM_TIMEOUT: 'The upstream service timed out. Please try again.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a minute before trying again.',
  MISSING_API_KEY:
    'Server Gemini API key is not configured. Check Settings > Secrets in AI Studio.',
  INVALID_REQUEST_BODY: 'Invalid profile or air quality payload provided.',
  INVALID_JSON: 'Malformed JSON request body.',
  PAYLOAD_TOO_LARGE: 'Request body exceeds the allowed size limit.',
  UNSUPPORTED_MEDIA_TYPE: 'Content-Type must be application/json.',
  METHOD_NOT_ALLOWED: 'HTTP method not allowed for this endpoint.',
  CORS_ORIGIN_FORBIDDEN: 'Cross-origin requests are not allowed.',
  API_ROUTE_NOT_FOUND: 'API route not found.',
  NETWORK_ERROR: 'Network connection failed while contacting the service.',
} as const;
