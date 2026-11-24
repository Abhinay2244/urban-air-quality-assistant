/**
 * @module constants/limits
 * Responsibility: Define numeric validation and timing bounds for user inputs and assistant state.
 * Must not contain HTTP routes, error copy, UI strings, or runtime validation functions.
 */

/**
 * Input validation limits for user-entered fields and AI outputs.
 */
export const INPUT_LIMITS = {
  MIN_CITY_LENGTH: 2,
  MAX_CITY_LENGTH: 80,
  MAX_CITY_SEARCH_RESULTS: 8,
  CITY_SEARCH_DEBOUNCE_MS: 250,
  MIN_LATITUDE: -90,
  MAX_LATITUDE: 90,
  MIN_LONGITUDE: -180,
  MAX_LONGITUDE: 180,
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
  MAX_PM10_VALUE: 2000,
  HOURLY_FORECAST_HOURS: 24,
  SUBMIT_COOLDOWN_SECONDS: 5,
  COOLDOWN_TICK_MS: 1000,
} as const;
