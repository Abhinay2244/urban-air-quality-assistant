/**
 * @module constants/urgencyTemplates
 * Responsibility: Provide static recommendation templates and labels used by the urgency rule engine.
 * Must not execute rule logic, evaluate profiles, or depend on UI/service modules.
 */
import { RecommendationCategory, UrgencyLevel } from '../types/index.ts';

/**
 * Audience labels and very-unhealthy-AQI protective alert template.
 */
export const VERY_UNHEALTHY_ALERT_TEMPLATE = {
  TITLE: 'Stay Indoors and Wear a Fitted N95 Mask for Essential Trips',
  CATEGORY: RecommendationCategory.HEALTH_ALERT,
  IMPACT_EXPLANATION:
    'Prevents acute PM2.5 inhalation spikes that trigger airway inflammation and flare-ups.',
  ESTIMATED_PM25_REDUCTION: 70,
  URGENCY: UrgencyLevel.CRITICAL,
  DEFAULT_AUDIENCE: 'all household members',
  AUDIENCE_RESPIRATORY: 'members with respiratory conditions',
  AUDIENCE_CHILDREN: 'children',
  AUDIENCE_ELDERLY: 'older adults',
  MASK_KEYWORD: 'mask',
} as const;

/**
 * Priority guidance headline builder constants for very unhealthy conditions.
 */
export const VERY_UNHEALTHY_PRIORITY_TEMPLATE = {
  PREFIX: 'Stay indoors, seal living spaces, and use a fitted N95 mask for essential trips (AQI ',
  SUFFIX: ').',
} as const;

/**
 * Profile-specific recommendation templates injected by dynamic urgency rules.
 */
export const CONTEXT_RULE_TEMPLATES = {
  WALK_OR_BIKE: {
    title: 'Pause Active Outdoor Commuting During Smog Peaks',
    category: RecommendationCategory.DAILY_ROUTINE,
    action:
      'Switch walking or cycling trips to enclosed transit or carpools during inversion hours.',
    impactExplanation:
      'Avoiding heavy outdoor breathing near traffic cuts inhaled PM2.5 dramatically.',
    estimatedPM25Reduction: 45,
    urgency: UrgencyLevel.HIGH,
  },
  COMPACT_HOUSING: {
    title: 'Seal Shared Hallway and Window Drafts',
    category: RecommendationCategory.INDOOR_AIR,
    action:
      'Place door sweeps under corridor doors and minimize exhaust-fan runtime during smog peaks.',
    impactExplanation:
      'Reduces stack-effect infiltration of outdoor winter smog into compact living spaces.',
    estimatedPM25Reduction: 35,
    urgency: UrgencyLevel.HIGH,
  },
  DEFAULT_ECO_TRIP: {
    title: 'Replace Private Car Cold-Starts with Bundled Eco-Trips',
    category: RecommendationCategory.SUSTAINABLE_ALTERNATIVE,
    action:
      'Bundle errands into one mid-day trip, set cabin HVAC to recirculate, and avoid idling.',
    impactExplanation:
      'Eliminates high-emission cold-start exhaust and lowers in-cabin particle infiltration.',
    estimatedPM25Reduction: 30,
    urgency: UrgencyLevel.HIGH,
  },
} as const;
