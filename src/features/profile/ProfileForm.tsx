import type { ReactElement, SyntheticEvent } from 'react';
import { SpinnerIcon } from '../../components/Icons.tsx';
import { APP_TEXT } from '@shared/constants/config.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import type { ProfileFieldErrors } from '../../hooks/useProfile.ts';
import type { CitySearchResult, UserProfile } from '@shared/types/index.ts';
import { LocationCard } from './LocationCard.tsx';
import { HouseholdProfileCard, LifestyleProfileCard } from './ProfilePreferenceCards.tsx';

/** Props for ProfileForm feature component. */
export interface ProfileFormProps {
  profile: UserProfile;
  fieldErrors: ProfileFieldErrors;
  isLoading: boolean;
  cooldownSeconds: number;
  cooldownNotice?: string | null;
  onFieldChange: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => void;
  onSelectCityResult?: (result: CitySearchResult) => void;
  onSubmit: () => void;
}

function formatSubmitButtonLabel(isLoading: boolean, cooldownSeconds: number): string {
  if (isLoading) {
    return APP_TEXT.LOADING_LABEL;
  }
  if (cooldownSeconds > 0) {
    return `${UI_COPY.COOLDOWN_BUTTON_PREFIX} ${cooldownSeconds}${UI_COPY.COOLDOWN_BUTTON_SUFFIX}`;
  }
  return APP_TEXT.SUBMIT_LABEL;
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
  onSubmit,
}: Readonly<ProfileFormProps>): ReactElement {
  const cityError = fieldErrors.city;
  const isSubmitDisabled = isLoading || cooldownSeconds > 0 || Boolean(cityError);
  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit();
  };
  const buttonLabel = formatSubmitButtonLabel(isLoading, cooldownSeconds);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <LocationCard
        city={profile.city}
        {...(cityError !== undefined ? { cityError } : {})}
        onCityChange={(nextCity) => {
          onFieldChange('city', nextCity);
        }}
        {...(onSelectCityResult !== undefined ? { onSelectCityResult } : {})}
      />

      <HouseholdProfileCard profile={profile} onFieldChange={onFieldChange} />
      <LifestyleProfileCard profile={profile} onFieldChange={onFieldChange} />

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
