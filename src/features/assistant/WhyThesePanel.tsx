import type { ReactElement } from 'react';
import { PROFILE_OPTIONS, UI_LABELS } from '../../constants/config.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import type { AQIData, UserProfile } from '../../types/index.ts';
import { getAQICategoryInfo } from '../../utils/formatting.ts';

/**
 * Props for WhyThesePanel component.
 */
export interface WhyThesePanelProps {
  profile: UserProfile;
  aqiData: AQIData | null;
}

function findLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string,
): string {
  return options.find((opt) => opt.value === value)?.label ?? value;
}

/**
 * Surfaces the city, AQI, sensitivities, commute, and home inputs driving AI recommendations.
 */
export function WhyThesePanel({ profile, aqiData }: WhyThesePanelProps): ReactElement {
  const chips: string[] = [aqiData ? aqiData.city : profile.city];

  if (aqiData) {
    const category = getAQICategoryInfo(aqiData.category);
    chips.push(`${UI_LABELS.AQI_LABEL} ${aqiData.aqi} (${category.label})`);
  }

  if (profile.hasChildren) chips.push(UI_LABELS.HAS_CHILDREN_LABEL);
  if (profile.hasElderly) chips.push(UI_LABELS.HAS_ELDERLY_LABEL);
  if (profile.hasRespiratoryCondition) chips.push(UI_LABELS.HAS_RESPIRATORY_LABEL);

  chips.push(findLabel(PROFILE_OPTIONS.COMMUTE_MODES, profile.commuteMode));
  chips.push(findLabel(PROFILE_OPTIONS.HOME_TYPES, profile.homeType));

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {UI_COPY.WHY_THESE_TITLE}
      </p>
      <p className="mt-0.5 mb-3 text-sm text-slate-600 dark:text-slate-400">
        {UI_COPY.WHY_THESE_SUBTITLE}
      </p>
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li
            key={chip}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {chip}
          </li>
        ))}
      </ul>
    </div>
  );
}
