import { CommuteMode, FamilyType, HomeType, type UserProfile } from '../types/index.ts';

export { API_ENDPOINTS, ERROR_MESSAGES, INPUT_LIMITS } from './limits.ts';

/**
 * User-facing labels and messages centralized to avoid hardcoded UI strings.
 */
export const APP_TEXT = {
  APP_TITLE: 'Urban Air Quality Assistant',
  APP_SUBTITLE:
    'Tailored low-emission routines, indoor air strategies, and measurable exposure guidance for winter smog.',
  SUBMIT_LABEL: 'Get Air Quality Plan',
  LOADING_LABEL: 'Analyzing local air & generating plan...',
  COOLDOWN_PREFIX: 'Please wait',
  COOLDOWN_SUFFIX: 's before submitting again',
  EMPTY_PLAN_MESSAGE:
    'Enter your city and household profile above to generate a four-part winter smog action plan.',
  EMPTY_CATEGORY_MESSAGE: 'No additional actions needed for this section at the current AQI level.',
  FALLBACK_NOTICE:
    'Showing tailored baseline smog-protection guidance because the structured AI response could not be parsed.',
  MANUAL_AQI_NOTICE:
    'Live air quality API is unavailable. Enter your local AQI reading below to generate recommendations.',
  MANUAL_AQI_SOURCE_LABEL: 'Manual AQI Entry',
  LIVE_AQI_SOURCE_LABEL: 'Live Air Quality Reading',
  FOOTER_NOTE:
    'Guidance estimates personal PM2.5 exposure and emission reductions for educational planning; consult local public health authorities during emergencies.',
  PM25_UNIT: 'ug/m3',
  REDUCTION_PERCENT_UNIT: '%',
  DEFAULT_COUNTRY: 'Unknown',
} as const;

/**
 * Default household profile state.
 */
export const DEFAULT_USER_PROFILE: UserProfile = {
  city: 'New Delhi',
  familyType: FamilyType.NUCLEAR,
  hasChildren: true,
  hasElderly: false,
  hasRespiratoryCondition: false,
  commuteMode: CommuteMode.PUBLIC_TRANSIT,
  homeType: HomeType.APARTMENT,
};

/**
 * Selectable options for household profile form fields.
 */
export const PROFILE_OPTIONS = {
  FAMILY_TYPES: [
    { value: FamilyType.SINGLE, label: 'Single adult' },
    { value: FamilyType.COUPLE, label: 'Couple' },
    { value: FamilyType.NUCLEAR, label: 'Nuclear family' },
    { value: FamilyType.MULTI_GENERATIONAL, label: 'Multi-generational' },
  ],
  COMMUTE_MODES: [
    { value: CommuteMode.PUBLIC_TRANSIT, label: 'Public transit' },
    { value: CommuteMode.CAR, label: 'Private car' },
    { value: CommuteMode.WALK_OR_BIKE, label: 'Walking or cycling' },
    { value: CommuteMode.MIXED, label: 'Mixed commute' },
    { value: CommuteMode.REMOTE, label: 'Work / study from home' },
  ],
  HOME_TYPES: [
    { value: HomeType.APARTMENT, label: 'Apartment' },
    { value: HomeType.DETACHED_HOUSE, label: 'Detached house' },
    { value: HomeType.TOWNHOUSE, label: 'Townhouse' },
    { value: HomeType.SHARED_HOUSING, label: 'Shared housing' },
  ],
} as const;

/**
 * UI labels and section titles shared across presentational components.
 */
export const UI_LABELS = {
  PROFILE_SECTION_TITLE: 'Household Profile',
  IMPACT_SECTION_TITLE: 'Current Air Quality & Impact',
  ASSISTANT_SECTION_TITLE: 'Tailored Action Plan',
  CITY_LABEL: 'City',
  CITY_HINT: 'Enter the city or metro area you live in.',
  CITY_PLACEHOLDER: 'e.g. New Delhi, Lahore, Beijing',
  FAMILY_TYPE_LABEL: 'Household Type',
  COMMUTE_MODE_LABEL: 'Primary Commute',
  HOME_TYPE_LABEL: 'Home Type',
  VULNERABILITY_GROUP_LEGEND: 'Household Sensitivities',
  HAS_CHILDREN_LABEL: 'Children in household',
  HAS_ELDERLY_LABEL: 'Older adults in household',
  HAS_RESPIRATORY_LABEL: 'Respiratory sensitivity',
  DISMISS_ERROR_LABEL: 'Dismiss',
  RETRY_LABEL: 'Retry',
  AQI_LABEL: 'US AQI',
  PM25_LABEL: 'PM2.5',
  COMBINED_REDUCTION_LABEL: 'Total Estimated PM2.5 Reduction',
  PRIORITY_LABEL: 'Top Priority Today',
  IMPACT_EXPLANATION_LABEL: 'Direct impact',
  PM25_REDUCTION_LABEL: 'Estimated PM2.5 reduction',
  MANUAL_AQI_TITLE: 'Manual AQI Entry',
  MANUAL_AQI_INPUT_LABEL: 'Current US AQI (0–500)',
  MANUAL_PM25_INPUT_LABEL: 'Optional PM2.5 (ug/m3)',
  MANUAL_AQI_SUBMIT_LABEL: 'Generate Plan with Manual AQI',
  SWITCH_TO_MANUAL_LABEL: 'Enter AQI manually',
  SECTION_DAILY_ROUTINE: 'Daily Routine (Low-Emission)',
  SECTION_INDOOR_AIR: 'Indoor Air Hacks',
  SECTION_SUSTAINABLE: 'Sustainable Alternatives',
  SECTION_HEALTH_ALERTS: 'Health Alerts for Vulnerable Members',
} as const;
