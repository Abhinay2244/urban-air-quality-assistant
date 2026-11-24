/**
 * @module constants/uiTheme
 * Responsibility: Store Tailwind styling tokens, AQI gauge geometry, and visual copy constants.
 * Must not contain business logic, React components, or API/server configuration.
 */
import { AqiCategoryId, RecommendationCategory } from '../types/index.ts';

/**
 * UI copy and section headings across the application.
 */
export const UI_COPY = {
  TAGLINE: 'Breathe smarter through smog',
  HERO_HEADLINE: 'Calm, practical air protection for your home today.',
  HERO_SUBTITLE:
    'Enter your city and household routine to get live AQI insights and measurable PM2.5 reductions.',
  LOCATION_CARD_TITLE: 'Location',
  HOUSEHOLD_CARD_TITLE: 'Household',
  LIFESTYLE_CARD_TITLE: 'Lifestyle',
  EXPOSURE_LEAD: 'You could cut PM2.5 exposure by',
  EXPOSURE_SUBTEXT: 'Combined estimate across all recommended actions today',
  WHY_THESE_TITLE: 'Why these suggestions',
  WHY_THESE_SUBTITLE: 'Tailored to your provided AQI reading and household context',
  EMPTY_TITLE: 'Ready when you are',
  EMPTY_SAMPLE_PROMPT_LABEL: 'Try a sample scenario:',
  SAMPLE_A11Y_PREFIX: 'Load sample profile for',
  THEME_TOGGLE_LIGHT: 'Switch to light theme',
  THEME_TOGGLE_DARK: 'Switch to dark theme',
  DATA_SOURCES: 'Data sources: Open-Meteo Air Quality, WAQI, and Gemini.',
  DISCLAIMER: 'General guidance, not medical advice.',
  COOLDOWN_BUTTON_PREFIX: 'Wait',
  COOLDOWN_BUTTON_SUFFIX: 's to refresh',
  COOLDOWN_NOTICE_PREFIX: 'Please wait',
  COOLDOWN_NOTICE_SINGULAR_UNIT: 'second',
  COOLDOWN_NOTICE_PLURAL_UNIT: 'seconds',
  BEST_OUTDOOR_TITLE: 'Best time for outdoor activity',
  BEST_OUTDOOR_SUBTITLE: 'Lowest 2-hour average PM2.5 in the next 24 hours',
  BEST_OUTDOOR_AVG_LABEL: 'Avg PM2.5',
  TODAYS_PLAN_TITLE: "Today's plan",
  TODAYS_PLAN_SUBTITLE: 'Expected PM2.5 and suggested activity by time of day',
  ABOVE_SCALE_NOTE: 'above scale',
  GEOLOCATION_REQUESTING:
    'Requesting location permission to find your nearest monitoring station...',
  GEOLOCATION_DENIED:
    'Location permission was blocked. Allow location access in your browser site settings (lock or tune icon next to the address bar) and retry, or search and pick your Indian city below.',
  GEOLOCATION_POSITION_UNAVAILABLE:
    'Your current position could not be determined by your device or browser. Search and pick your Indian city below instead.',
  GEOLOCATION_TIMEOUT:
    'Location lookup timed out. Click Use my location to retry, or search and pick your Indian city below.',
  GEOLOCATION_UNAVAILABLE:
    'Browser location is unavailable here. Search and pick your Indian city below instead.',
  CITY_SEARCH_EMPTY: 'No matching Indian cities found. You can still type your city name directly.',
} as const;

/**
 * Visual styling tokens for each US EPA AQI severity tier in light and dark mode (WCAG AA contrast).
 */
export const AQI_VISUAL_TOKENS: Record<
  AqiCategoryId,
  { strokeHex: string; badgeClass: string; surfaceClass: string }
> = {
  [AqiCategoryId.GOOD]: {
    strokeHex: '#059669',
    badgeClass:
      'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700',
    surfaceClass:
      'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/70',
  },
  [AqiCategoryId.MODERATE]: {
    strokeHex: '#65a30d',
    badgeClass:
      'bg-lime-50 text-lime-900 border-lime-300 dark:bg-lime-950/70 dark:text-lime-200 dark:border-lime-700',
    surfaceClass: 'bg-lime-50/70 border-lime-200 dark:bg-lime-950/30 dark:border-lime-800/70',
  },
  [AqiCategoryId.UNHEALTHY_SENSITIVE]: {
    strokeHex: '#d97706',
    badgeClass:
      'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700',
    surfaceClass: 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/70',
  },
  [AqiCategoryId.UNHEALTHY]: {
    strokeHex: '#ea580c',
    badgeClass:
      'bg-orange-50 text-orange-900 border-orange-300 dark:bg-orange-950/70 dark:text-orange-200 dark:border-orange-700',
    surfaceClass:
      'bg-orange-50/70 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800/70',
  },
  [AqiCategoryId.VERY_UNHEALTHY]: {
    strokeHex: '#dc2626',
    badgeClass:
      'bg-red-50 text-red-900 border-red-300 dark:bg-red-950/70 dark:text-red-200 dark:border-red-700',
    surfaceClass: 'bg-red-50/70 border-red-200 dark:bg-red-950/30 dark:border-red-800/70',
  },
  [AqiCategoryId.HAZARDOUS]: {
    strokeHex: '#be123c',
    badgeClass:
      'bg-rose-900 text-rose-50 border-rose-800 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-700',
    surfaceClass: 'bg-rose-50/80 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800',
  },
};

/**
 * Accent styling per recommendation section; Health Alerts uses stronger tinting when active.
 */
export const SECTION_THEMES: Record<
  RecommendationCategory,
  { iconBg: string; cardBorder: string; containerClass: string }
> = {
  [RecommendationCategory.HEALTH_ALERT]: {
    iconBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
    cardBorder: 'border-rose-200 dark:border-rose-800/70',
    containerClass:
      'rounded-2xl border border-rose-300 bg-rose-50/80 p-4 dark:border-rose-800/80 dark:bg-rose-950/35',
  },
  [RecommendationCategory.DAILY_ROUTINE]: {
    iconBg: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
    cardBorder: 'border-slate-200 dark:border-slate-800',
    containerClass: '',
  },
  [RecommendationCategory.INDOOR_AIR]: {
    iconBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
    cardBorder: 'border-slate-200 dark:border-slate-800',
    containerClass: '',
  },
  [RecommendationCategory.SUSTAINABLE_ALTERNATIVE]: {
    iconBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
    cardBorder: 'border-slate-200 dark:border-slate-800',
    containerClass: '',
  },
};

/**
 * SVG geometry constants for the circular AQI gauge.
 */
export const GAUGE_METRICS = {
  RADIUS: 52,
  STROKE_WIDTH: 10,
  VIEWBOX_SIZE: 128,
} as const;
