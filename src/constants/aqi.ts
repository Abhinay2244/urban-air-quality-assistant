import { AQICategoryId, type AQICategoryInfo } from '../types/index.ts';

/**
 * Standard US EPA AQI breakpoints, color tokens, and public health guidance.
 */
export const AQI_CATEGORIES: readonly AQICategoryInfo[] = [
  {
    id: AQICategoryId.GOOD,
    label: 'Good',
    minAqi: 0,
    maxAqi: 50,
    colorHex: '#15803d',
    badgeClass: 'bg-green-100 text-green-900 border-green-300',
    healthGuidance:
      'Air quality is satisfactory. Normal outdoor routines and natural ventilation are safe.',
  },
  {
    id: AQICategoryId.MODERATE,
    label: 'Moderate',
    minAqi: 51,
    maxAqi: 100,
    colorHex: '#a16207',
    badgeClass: 'bg-yellow-100 text-yellow-900 border-yellow-400',
    healthGuidance:
      'Air quality is acceptable, though unusually sensitive individuals should monitor symptoms.',
  },
  {
    id: AQICategoryId.UNHEALTHY_SENSITIVE,
    label: 'Unhealthy for Sensitive Groups',
    minAqi: 101,
    maxAqi: 150,
    colorHex: '#c2410c',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
    healthGuidance:
      'Children, older adults, and people with respiratory conditions should limit prolonged outdoor exertion.',
  },
  {
    id: AQICategoryId.UNHEALTHY,
    label: 'Unhealthy',
    minAqi: 151,
    maxAqi: 200,
    colorHex: '#b91c1c',
    badgeClass: 'bg-red-100 text-red-900 border-red-300',
    healthGuidance:
      'Everyone may begin to experience health effects. Shift strenuous activities indoors and run HEPA filtration.',
  },
  {
    id: AQICategoryId.VERY_UNHEALTHY,
    label: 'Very Unhealthy',
    minAqi: 201,
    maxAqi: 300,
    colorHex: '#7e22ce',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    healthGuidance:
      'Health alert: seal drafts, run indoor air purifiers continuously, and wear N95 masks for essential trips.',
  },
  {
    id: AQICategoryId.HAZARDOUS,
    label: 'Hazardous',
    minAqi: 301,
    maxAqi: 500,
    colorHex: '#7f1d1d',
    badgeClass: 'bg-rose-950 text-rose-50 border-rose-800',
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
  SEVERE: 201,
  HAZARDOUS: 301,
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
