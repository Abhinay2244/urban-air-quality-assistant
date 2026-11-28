import type { ReactElement } from 'react';
import { UI_LABELS } from '@shared/constants/config.ts';
import type { AppError, CitySearchResult } from '@shared/types/index.ts';
import { LocationIcon } from '../../components/Icons.tsx';
import { SectionCard } from '../../components/SectionCard.tsx';
import { UI_COPY } from '../../constants/uiTheme.ts';
import { CitySuggestionsList } from './CitySuggestionsList.tsx';
import { LocationCityInput } from './LocationCityInput.tsx';
import { formatSuggestionCount } from './cityComboboxHelpers.ts';
import { useCityCombobox } from './useCityCombobox.ts';

/** Props for LocationCard component. */
export interface LocationCardProps {
  city: string;
  cityError?: AppError;
  onCityChange: (nextCity: string) => void;
  onSelectCityResult?: (result: CitySearchResult) => void;
}

const CITY_INPUT_ID = 'profile-city-input';
const CITY_HINT_ID = 'profile-city-hint';
const CITY_ERROR_ID = 'profile-city-error';
const CITY_LISTBOX_ID = 'profile-city-listbox';
const getOptionId = (index: number): string => `profile-city-option-${index}`;

function LocationComboboxFeedback({
  suggestionCountAnnouncement,
  isExpanded,
  suggestions,
  clampedActiveIndex,
  onSelectSuggestion,
  cityError,
}: Readonly<{
  suggestionCountAnnouncement: string;
  isExpanded: boolean;
  suggestions: readonly CitySearchResult[];
  clampedActiveIndex: number;
  onSelectSuggestion: (item: CitySearchResult) => void;
  cityError?: AppError;
}>): ReactElement {
  return (
    <>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {suggestionCountAnnouncement}
      </p>
      {isExpanded && (
        <CitySuggestionsList
          listboxId={CITY_LISTBOX_ID}
          suggestions={suggestions}
          activeIndex={clampedActiveIndex}
          getOptionId={getOptionId}
          onSelect={onSelectSuggestion}
        />
      )}
      <p id={CITY_HINT_ID} className="text-sm text-slate-600 dark:text-slate-400">
        {UI_LABELS.CITY_HINT}
      </p>
      {cityError && (
        <p
          id={CITY_ERROR_ID}
          role="alert"
          className="text-sm font-medium text-red-700 dark:text-red-300"
        >
          {cityError.message}
        </p>
      )}
    </>
  );
}

/**
 * Location card providing an accessible ARIA combobox for India-only city search and inline validation.
 */
export function LocationCard({
  city,
  cityError,
  onCityChange,
  onSelectCityResult,
}: Readonly<LocationCardProps>): ReactElement {
  const combo = useCityCombobox(onCityChange, onSelectCityResult);
  const activeOptionId =
    combo.clampedActiveIndex >= 0 ? getOptionId(combo.clampedActiveIndex) : undefined;

  return (
    <SectionCard title={UI_COPY.LOCATION_CARD_TITLE} icon={<LocationIcon />}>
      <div className="space-y-3 text-sm">
        <label
          htmlFor={CITY_INPUT_ID}
          className="block font-semibold text-slate-800 dark:text-slate-200"
        >
          {UI_LABELS.CITY_LABEL}
        </label>
        <LocationCityInput
          inputId={CITY_INPUT_ID}
          hintId={CITY_HINT_ID}
          errorId={CITY_ERROR_ID}
          listboxId={CITY_LISTBOX_ID}
          activeOptionId={activeOptionId}
          city={city}
          isExpanded={combo.isExpanded}
          hasError={Boolean(cityError)}
          onChange={combo.handleChange}
          onKeyDown={combo.handleKeyDown}
        />
        <LocationComboboxFeedback
          suggestionCountAnnouncement={formatSuggestionCount(combo.suggestions.length)}
          isExpanded={combo.isExpanded}
          suggestions={combo.suggestions}
          clampedActiveIndex={combo.clampedActiveIndex}
          onSelectSuggestion={combo.handleSelectSuggestion}
          {...(cityError !== undefined ? { cityError } : {})}
        />
      </div>
    </SectionCard>
  );
}
