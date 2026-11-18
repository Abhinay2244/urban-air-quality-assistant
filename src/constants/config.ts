import { CommuteMode, FamilyType, HomeType, type UserProfile } from '../types/index.ts';

export {
  API_ENDPOINTS,
  ERROR_MESSAGES,
  GEMINI_CONFIG,
  HTTP_STATUS,
  INPUT_LIMITS,
} from './limits.ts';

/**
 * User-facing labels and messages centralized to avoid hardcoded UI strings.
 */
export const APP_TEXT = {
  APP_TITLE: 'Urban Air Quality Assistant',
  APP_SUBTITLE:
    'Tailored low-emission routines, indoor air strategies, and measurable exposure guidance for winter smog.',
  SUBMIT_LABEL: 'Get Air Quality Plan',
  LOADING_LABEL: 'Analyzing local air & generating plan...',
  EMPTY_PLAN_MESSAGE:
    'Enter your city and household profile to generate tailored winter smog recommendations.',
  FALLBACK_NOTICE:
    'Showing verified baseline smog-protection guidance because the structured AI response could not be parsed.',
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
  CITY_PLACEHOLDER: 'e.g. New Delhi, Lahore, Beijing',
  FAMILY_TYPE_LABEL: 'Household Type',
  COMMUTE_MODE_LABEL: 'Primary Commute',
  HOME_TYPE_LABEL: 'Home Type',
  HAS_CHILDREN_LABEL: 'Children in household',
  HAS_ELDERLY_LABEL: 'Older adults in household',
  HAS_RESPIRATORY_LABEL: 'Respiratory sensitivity',
  DISMISS_ERROR_LABEL: 'Dismiss',
  AQI_LABEL: 'US AQI',
  PM25_LABEL: 'PM2.5',
  COMBINED_REDUCTION_LABEL: 'Estimated Combined PM2.5 Reduction',
  PRIORITY_LABEL: 'Top Priority Today',
  IMPACT_EXPLANATION_LABEL: 'Direct Impact',
  PM25_REDUCTION_LABEL: 'Est. PM2.5 Reduction',
} as const;
