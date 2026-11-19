/**
 * @module constants/aqi
 * Responsibility: Define US EPA AQI breakpoints, public health guidance, and WHO guideline thresholds.
 * Must not contain UI styling classes, HTTP endpoints, or calculation functions.
 */
import { AqiCategoryId, type AqiCategoryInfo } from '../types/index.ts';

/**
 * Standard US EPA AQI breakpoints, color tokens, and public health guidance.
 */
export const AQI_CATEGORIES: readonly AqiCategoryInfo[] = [
  {
    id: AqiCategoryId.GOOD,
    label: 'Good',
    minAqi: 0,
    maxAqi: 50,
    healthGuidance:
      'Air quality is satisfactory. Normal outdoor routines and natural ventilation are safe.',
  },
  {
    id: AqiCategoryId.MODERATE,
    label: 'Moderate',
    minAqi: 51,
    maxAqi: 100,
    healthGuidance:
      'Air quality is acceptable, though unusually sensitive individuals should monitor symptoms.',
  },
  {
    id: AqiCategoryId.UNHEALTHY_SENSITIVE,
    label: 'Unhealthy for Sensitive Groups',
    minAqi: 101,
    maxAqi: 150,
    healthGuidance:
      'Children, older adults, and people with respiratory conditions should limit prolonged outdoor exertion.',
  },
  {
    id: AqiCategoryId.UNHEALTHY,
    label: 'Unhealthy',
    minAqi: 151,
    maxAqi: 200,
    healthGuidance:
      'Everyone may begin to experience health effects. Shift strenuous activities indoors and run HEPA filtration.',
  },
  {
    id: AqiCategoryId.VERY_UNHEALTHY,
    label: 'Very Unhealthy',
    minAqi: 201,
    maxAqi: 300,
    healthGuidance:
      'Health alert: seal drafts, run indoor air purifiers continuously, and wear N95 masks for essential trips.',
  },
  {
    id: AqiCategoryId.HAZARDOUS,
    label: 'Hazardous',
    minAqi: 301,
    maxAqi: 500,
    healthGuidance:
      'Emergency conditions. Remain indoors with clean-air rooms, avoid all outdoor exertion, and monitor vulnerable family members.',
  },
];

/**
 * AQI breakpoint thresholds used by dynamic urgency rules.
 */
export const AQI_THRESHOLDS = {
  SENSITIVE: 101,
  UNHEALTHY: 151,
  VERY_UNHEALTHY: 201,
} as const;

/**
 * Default AQI upper bound when measurements exceed standard 500 scale.
 */
export const MAX_STANDARD_AQI = 500;

/**
 * Minimum valid AQI measurement value.
 */
export const MIN_STANDARD_AQI = 0;

/**
 * WHO 24-hour guideline threshold for fine particulate matter (ug/m3).
 */
export const WHO_PM25_GUIDELINE_UG_M3 = 15;
