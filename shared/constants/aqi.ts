/**
 * @module constants/aqi
 * Responsibility: Define US EPA AQI breakpoints, health guidance, WHO guidelines, and India geo bounds.
 * Must not contain UI styling classes, HTTP endpoints, or calculation functions.
 */
import { AqiCategoryId, type AqiCategoryInfo } from '../types/index.ts';

/**
 * US EPA AQI breakpoints and health guidance (US scale, as reported by WAQI and Open-Meteo).
 * Live readings above 500 are treated as Hazardous and displayed with an above-scale note.
 */
export const AQI_CATEGORIES: readonly [
  AqiCategoryInfo,
  AqiCategoryInfo,
  AqiCategoryInfo,
  AqiCategoryInfo,
  AqiCategoryInfo,
  AqiCategoryInfo,
] = [
  {
    id: AqiCategoryId.GOOD,
    label: 'Good',
    minAqi: 0,
    maxAqi: 50,
    healthGuidance:
      'Air quality is satisfactory. Normal outdoor routines, sports, and natural ventilation are safe.',
  },
  {
    id: AqiCategoryId.MODERATE,
    label: 'Moderate',
    minAqi: 51,
    maxAqi: 100,
    healthGuidance:
      'Air quality is acceptable; unusually sensitive individuals should monitor symptoms during prolonged outdoor exertion.',
  },
  {
    id: AqiCategoryId.UNHEALTHY_SENSITIVE,
    label: 'Unhealthy for Sensitive Groups',
    minAqi: 101,
    maxAqi: 150,
    healthGuidance:
      'Children, older adults, and people with lung or heart conditions should cut prolonged outdoor exertion and wear fitted masks near traffic.',
  },
  {
    id: AqiCategoryId.UNHEALTHY,
    label: 'Unhealthy',
    minAqi: 151,
    maxAqi: 200,
    healthGuidance:
      'Everyone may experience health effects. Stay indoors during smog peaks, wear a fitted N95/KF94 mask outside, and run filtration.',
  },
  {
    id: AqiCategoryId.VERY_UNHEALTHY,
    label: 'Very Unhealthy',
    minAqi: 201,
    maxAqi: 300,
    healthGuidance:
      'Health alert: risk increases for everyone. Keep windows sealed, move all exercise indoors, and run continuous HEPA filtration.',
  },
  {
    id: AqiCategoryId.HAZARDOUS,
    label: 'Hazardous',
    minAqi: 301,
    maxAqi: 500,
    healthGuidance:
      'Emergency conditions affecting everyone. Remain indoors in a filtered clean-air room and avoid outdoor physical activity.',
  },
];

/**
 * US EPA AQI breakpoint thresholds used by dynamic urgency rules.
 */
export const AQI_THRESHOLDS = {
  MODERATE: 51,
  UNHEALTHY_SENSITIVE: 101,
  UNHEALTHY: 151,
  VERY_UNHEALTHY: 201,
  HAZARDOUS: 301,
} as const;

/** Standard US AQI scale upper bound before flagging live readings as above scale. */
export const MAX_STANDARD_AQI = 500;

/** Minimum valid AQI measurement value. */
export const MIN_STANDARD_AQI = 0;

/** WHO 24-hour guideline threshold for fine particulate matter PM2.5 (ug/m3). */
export const WHO_PM25_GUIDELINE_UG_M3 = 15;

/** WHO 24-hour guideline threshold for coarse particulate matter PM10 (ug/m3). */
export const WHO_PM10_GUIDELINE_UG_M3 = 45;

/** Default continuous outdoor activity duration used when scanning 24h PM2.5 forecasts. */
export const OUTDOOR_WINDOW_DURATION_HOURS = 2;

/** Approximate inclusive geographic bounding box for India used to warn on out-of-country lookups. */
export const INDIA_GEO_BOUNDS = {
  MIN_LAT: 6.5,
  MAX_LAT: 37.5,
  MIN_LON: 68.0,
  MAX_LON: 97.5,
  COUNTRY_CODE: 'IN',
  COUNTRY_NAME: 'India',
} as const;

/** Maximum distance in km between requested city/coordinates and resolved monitoring station before warning. */
export const MAX_STATION_DISTANCE_KM = 50;
