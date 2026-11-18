import type { FormEvent, ReactElement } from 'react';
import { SectionCard } from '../../components/SectionCard.tsx';
import { APP_TEXT, PROFILE_OPTIONS, UI_LABELS } from '../../constants/config.ts';
import type { CommuteMode, FamilyType, HomeType, UserProfile } from '../../types/index.ts';

/**
 * Props for ProfileForm feature component.
 */
export interface ProfileFormProps {
  profile: UserProfile;
  isLoading: boolean;
  onFieldChange: <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => void;
  onSubmit: () => void;
}

/**
 * Captures household location, composition, commute, and housing details.
 */
export function ProfileForm({
  profile,
  isLoading,
  onFieldChange,
  onSubmit,
}: ProfileFormProps): ReactElement {
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <SectionCard title={UI_LABELS.PROFILE_SECTION_TITLE}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">{UI_LABELS.CITY_LABEL}</span>
            <input
              type="text"
              value={profile.city}
              placeholder={UI_LABELS.CITY_PLACEHOLDER}
              onChange={(event) => onFieldChange('city', event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              {UI_LABELS.FAMILY_TYPE_LABEL}
            </span>
            <select
              value={profile.familyType}
              onChange={(event) => onFieldChange('familyType', event.target.value as FamilyType)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {PROFILE_OPTIONS.FAMILY_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              {UI_LABELS.COMMUTE_MODE_LABEL}
            </span>
            <select
              value={profile.commuteMode}
              onChange={(event) => onFieldChange('commuteMode', event.target.value as CommuteMode)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {PROFILE_OPTIONS.COMMUTE_MODES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">
              {UI_LABELS.HOME_TYPE_LABEL}
            </span>
            <select
              value={profile.homeType}
              onChange={(event) => onFieldChange('homeType', event.target.value as HomeType)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {PROFILE_OPTIONS.HOME_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.hasChildren}
              onChange={(event) => onFieldChange('hasChildren', event.target.checked)}
            />
            <span>{UI_LABELS.HAS_CHILDREN_LABEL}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.hasElderly}
              onChange={(event) => onFieldChange('hasElderly', event.target.checked)}
            />
            <span>{UI_LABELS.HAS_ELDERLY_LABEL}</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.hasRespiratoryCondition}
              onChange={(event) => onFieldChange('hasRespiratoryCondition', event.target.checked)}
            />
            <span>{UI_LABELS.HAS_RESPIRATORY_LABEL}</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isLoading ? APP_TEXT.LOADING_LABEL : APP_TEXT.SUBMIT_LABEL}
        </button>
      </form>
    </SectionCard>
  );
}
