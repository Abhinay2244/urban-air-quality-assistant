import type { FormEvent, ReactElement } from 'react';
import { ChipToggle } from '../../components/ChipToggle.tsx';
import { SpinnerIcon } from '../../components/Icons.tsx';
import { CommuteIcon, HomeTypeIcon } from '../../components/ProfileIcons.tsx';
import { SectionCard } from '../../components/SectionCard.tsx';
import { SegmentedControl } from '../../components/SegmentedControl.tsx';
import { SensitivityIcon } from '../../components/SensitivityIcon.tsx';
import { APP_TEXT, UI_LABELS } from '../../constants/config.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import type { ProfileFieldErrors } from '../../hooks/useProfile.ts';
import type { CitySearchResult, Coordinates, UserProfile } from '../../types/index.ts';
import { LocationCard } from './LocationCard.tsx';
import {
  COMMUTE_MODE_FIELD,
  FAMILY_TYPE_FIELD,
  HOME_TYPE_FIELD,
  PROFILE_SENSITIVITY_FIELDS,
} from './profileFields.ts';

/** Props for ProfileForm feature component. */
export interface ProfileFormProps {
  profile: UserProfile;
  fieldErrors: ProfileFieldErrors;
  isLoading: boolean;
  cooldownSeconds: number;
  cooldownNotice?: string | null;
  onFieldChange: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => void;
  onSelectCityResult?: (result: CitySearchResult) => void;
  onUseCurrentLocation?: (coords: Coordinates) => void;
  onSubmit: () => void;
}

/** Captures location, household sensitivities, and lifestyle details across three clear cards. */
export function ProfileForm({
  profile,
  fieldErrors,
  isLoading,
  cooldownSeconds,
  cooldownNotice = null,
  onFieldChange,
  onSelectCityResult,
  onUseCurrentLocation,
  onSubmit,
}: ProfileFormProps): ReactElement {
  const cityError = fieldErrors.city;
  const isSubmitDisabled = isLoading || cooldownSeconds > 0 || Boolean(cityError);
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit();
  };
  const buttonLabel = isLoading
    ? APP_TEXT.LOADING_LABEL
    : cooldownSeconds > 0
      ? `${UI_COPY.COOLDOWN_BUTTON_PREFIX} ${cooldownSeconds}${UI_COPY.COOLDOWN_BUTTON_SUFFIX}`
      : APP_TEXT.SUBMIT_LABEL;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <LocationCard
        city={profile.city}
        cityError={cityError}
        isLoading={isLoading}
        onCityChange={(nextCity) => onFieldChange('city', nextCity)}
        onSelectCityResult={onSelectCityResult}
        onUseCurrentLocation={onUseCurrentLocation}
      />

      <SectionCard title={UI_COPY.HOUSEHOLD_CARD_TITLE}>
        <div className="space-y-5">
          <SegmentedControl
            legend={FAMILY_TYPE_FIELD.legend}
            value={profile.familyType}
            options={FAMILY_TYPE_FIELD.options}
            onChange={(nextValue) => onFieldChange('familyType', nextValue)}
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
                  onToggle={(nextChecked) => onFieldChange(item.field, nextChecked)}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </SectionCard>

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
            onChange={(nextValue) => onFieldChange('commuteMode', nextValue)}
          />

          <SegmentedControl
            legend={HOME_TYPE_FIELD.legend}
            value={profile.homeType}
            options={HOME_TYPE_FIELD.options.map((opt) => ({
              value: opt.value,
              label: opt.label,
              icon: <HomeTypeIcon homeType={opt.value} />,
            }))}
            onChange={(nextValue) => onFieldChange('homeType', nextValue)}
          />
        </div>
      </SectionCard>

      <button
        type="submit"
        disabled={isLoading || Boolean(cityError)}
        aria-disabled={isSubmitDisabled}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-teal-700 px-5 py-3 text-base font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
      >
        {isLoading && <SpinnerIcon />}
        <span>{buttonLabel}</span>
      </button>

      {cooldownNotice && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-950 dark:border-amber-700/80 dark:bg-amber-950/50 dark:text-amber-100"
        >
          {cooldownNotice}
        </p>
      )}
    </form>
  );
}
