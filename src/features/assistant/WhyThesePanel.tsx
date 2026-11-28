import type { ReactElement } from 'react';
import { PROFILE_OPTIONS, UI_LABELS } from '@shared/constants/config.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import type { AqiData, UserProfile } from '@shared/types/index.ts';
import { getAqiCategoryInfo } from '../../utils/aqiCalculations.ts';
import { formatPM25Value } from '@shared/utils/formatting.ts';

/**
 * Props for WhyThesePanel component.
 */
export interface WhyThesePanelProps {
  profile: UserProfile;
  aqiData: AqiData | null;
}

function findLabel(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((opt) => opt.value === value)?.label ?? value;
}

interface ContextChip {
  id: string;
  label: string;
}

/**
 * Surfaces the city, AQI, PM10, persona, sensitivities, commute, and home inputs driving AI guidance.
 */
export function WhyThesePanel({ profile, aqiData }: Readonly<WhyThesePanelProps>): ReactElement {
  const chips: ContextChip[] = [{ id: 'city', label: aqiData ? aqiData.city : profile.city }];

  if (aqiData) {
    const category = getAqiCategoryInfo(aqiData.category);
    chips.push({ id: 'aqi', label: `${UI_LABELS.AQI_LABEL} ${aqiData.aqi} (${category.label})` });
    if (aqiData.pm10 !== undefined) {
      chips.push({
        id: 'pm10',
        label: `${UI_LABELS.PM10_LABEL} ${formatPM25Value(aqiData.pm10)}`,
      });
    }
  }

  chips.push({
    id: 'familyType',
    label: findLabel(PROFILE_OPTIONS.FAMILY_TYPES, profile.familyType),
  });
  if (profile.hasChildren) chips.push({ id: 'children', label: UI_LABELS.HAS_CHILDREN_LABEL });
  if (profile.hasElderly) chips.push({ id: 'elderly', label: UI_LABELS.HAS_ELDERLY_LABEL });
  if (profile.hasRespiratoryCondition) {
    chips.push({ id: 'respiratory', label: UI_LABELS.HAS_RESPIRATORY_LABEL });
  }

  chips.push({
    id: 'commute',
    label: findLabel(PROFILE_OPTIONS.COMMUTE_MODES, profile.commuteMode),
  });
  chips.push({ id: 'home', label: findLabel(PROFILE_OPTIONS.HOME_TYPES, profile.homeType) });

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
            key={chip.id}
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {chip.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
