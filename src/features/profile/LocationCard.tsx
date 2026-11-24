import type { ReactElement } from 'react';
import { LocationIcon } from '../../components/Icons.tsx';
import { SectionCard } from '../../components/SectionCard.tsx';
import { UI_LABELS } from '../../constants/config.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import type { AppError, CitySearchResult } from '../../types/index.ts';
import { useCityAutocomplete } from './useCityAutocomplete.ts';

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

/**
 * Location card providing India-only city search suggestions and inline validation.
 */
export function LocationCard({
  city,
  cityError,
  onCityChange,
  onSelectCityResult,
}: LocationCardProps): ReactElement {
  const { suggestions, clearSuggestions, triggerCitySearch } = useCityAutocomplete();
  const cityDescribedBy = cityError ? `${CITY_HINT_ID} ${CITY_ERROR_ID}` : CITY_HINT_ID;

  const handleCityInput = (nextValue: string): void => {
    onCityChange(nextValue);
    triggerCitySearch(nextValue);
  };

  const handleSelectSuggestion = (item: CitySearchResult): void => {
    clearSuggestions();
    onCityChange(item.name);
    onSelectCityResult?.(item);
  };

  return (
    <SectionCard title={UI_COPY.LOCATION_CARD_TITLE} icon={<LocationIcon />}>
      <div className="space-y-3 text-sm">
        <label
          htmlFor={CITY_INPUT_ID}
          className="block font-semibold text-slate-800 dark:text-slate-200"
        >
          {UI_LABELS.CITY_LABEL}
        </label>

        <input
          id={CITY_INPUT_ID}
          type="text"
          value={city}
          autoComplete="off"
          placeholder={UI_LABELS.CITY_PLACEHOLDER}
          aria-invalid={Boolean(cityError)}
          aria-describedby={cityDescribedBy}
          onChange={(event) => handleCityInput(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-2xs transition-colors duration-150 placeholder:text-slate-400 focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400"
        />

        {suggestions.length > 0 && (
          <ul
            aria-label={UI_LABELS.CITY_SUGGESTIONS_LABEL}
            className="max-h-48 divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-950"
          >
            {suggestions.map((item) => (
              <li key={`${item.name}-${item.latitude}-${item.longitude}`}>
                <button
                  type="button"
                  onClick={() => handleSelectSuggestion(item)}
                  className="flex min-h-11 w-full items-center justify-between px-3.5 py-2 text-left text-sm text-slate-900 hover:bg-teal-50 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    {item.admin1 ? `${item.admin1}, ${item.country}` : item.country}
                  </span>
                </button>
              </li>
            ))}
          </ul>
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
      </div>
    </SectionCard>
  );
}
