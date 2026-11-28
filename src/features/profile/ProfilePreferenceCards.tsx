import type { ReactElement } from 'react';
import { ChipToggle } from '../../components/ChipToggle.tsx';
import { CommuteIcon, HomeTypeIcon } from '../../components/ProfileIcons.tsx';
import { SectionCard } from '../../components/SectionCard.tsx';
import { SegmentedControl } from '../../components/SegmentedControl.tsx';
import { SensitivityIcon } from '../../components/SensitivityIcon.tsx';
import { UI_LABELS } from '@shared/constants/config.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import type { UserProfile } from '@shared/types/index.ts';
import {
  COMMUTE_MODE_FIELD,
  FAMILY_TYPE_FIELD,
  HOME_TYPE_FIELD,
  PROFILE_SENSITIVITY_FIELDS,
} from './profileFields.ts';

/** Props for household and lifestyle profile preference sections. */
export interface ProfilePreferenceCardsProps {
  profile: UserProfile;
  onFieldChange: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => void;
}

/** Renders the household type segmented selector and sensitivity toggle chips. */
export function HouseholdProfileCard({
  profile,
  onFieldChange,
}: Readonly<ProfilePreferenceCardsProps>): ReactElement {
  return (
    <SectionCard title={UI_COPY.HOUSEHOLD_CARD_TITLE}>
      <div className="space-y-5">
        <SegmentedControl
          legend={FAMILY_TYPE_FIELD.legend}
          value={profile.familyType}
          options={FAMILY_TYPE_FIELD.options}
          onChange={(nextValue) => {
            onFieldChange('familyType', nextValue);
          }}
        />

        <fieldset className="space-y-2.5">
          <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {UI_LABELS.VULNERABILITY_GROUP_LEGEND}
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {PROFILE_SENSITIVITY_FIELDS.map((item) => (
              <ChipToggle
                key={item.field}
                label={item.label}
                checked={profile[item.field]}
                icon={<SensitivityIcon field={item.field} />}
                onToggle={(nextChecked) => {
                  onFieldChange(item.field, nextChecked);
                }}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </SectionCard>
  );
}

/** Renders the daily commute mode and home type segmented selectors. */
export function LifestyleProfileCard({
  profile,
  onFieldChange,
}: Readonly<ProfilePreferenceCardsProps>): ReactElement {
  return (
    <SectionCard title={UI_COPY.LIFESTYLE_CARD_TITLE}>
      <div className="space-y-5">
        <SegmentedControl
          legend={COMMUTE_MODE_FIELD.legend}
          value={profile.commuteMode}
          options={COMMUTE_MODE_FIELD.options.map((opt) => ({
            value: opt.value,
            label: opt.label,
            icon: <CommuteIcon mode={opt.value} />,
          }))}
          onChange={(nextValue) => {
            onFieldChange('commuteMode', nextValue);
          }}
        />

        <SegmentedControl
          legend={HOME_TYPE_FIELD.legend}
          value={profile.homeType}
          options={HOME_TYPE_FIELD.options.map((opt) => ({
            value: opt.value,
            label: opt.label,
            icon: <HomeTypeIcon homeType={opt.value} />,
          }))}
          onChange={(nextValue) => {
            onFieldChange('homeType', nextValue);
          }}
        />
      </div>
    </SectionCard>
  );
}
