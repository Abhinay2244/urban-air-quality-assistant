import { PROFILE_OPTIONS, UI_LABELS } from '../../constants/config.ts';

/**
 * Metadata driving Household Type segmented choices.
 */
export const FAMILY_TYPE_FIELD = {
  legend: UI_LABELS.FAMILY_TYPE_LABEL,
  options: PROFILE_OPTIONS.FAMILY_TYPES,
} as const;

/**
 * Metadata driving Primary Commute segmented choices.
 */
export const COMMUTE_MODE_FIELD = {
  legend: UI_LABELS.COMMUTE_MODE_LABEL,
  options: PROFILE_OPTIONS.COMMUTE_MODES,
} as const;

/**
 * Metadata driving Home Type segmented choices.
 */
export const HOME_TYPE_FIELD = {
  legend: UI_LABELS.HOME_TYPE_LABEL,
  options: PROFILE_OPTIONS.HOME_TYPES,
} as const;

/**
 * Metadata driving pill-style sensitivity toggles in ProfileForm.
 */
export const PROFILE_SENSITIVITY_FIELDS = [
  { field: 'hasChildren' as const, label: UI_LABELS.HAS_CHILDREN_LABEL },
  { field: 'hasElderly' as const, label: UI_LABELS.HAS_ELDERLY_LABEL },
  { field: 'hasRespiratoryCondition' as const, label: UI_LABELS.HAS_RESPIRATORY_LABEL },
] as const;
