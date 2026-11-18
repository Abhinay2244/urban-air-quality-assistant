import type { ReactElement } from 'react';
import { LocationIcon } from '../../components/Icons.tsx';
import { SectionCard } from '../../components/SectionCard.tsx';
import { UI_LABELS } from '../../constants/config.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import type { AppError } from '../../types/index.ts';

/**
 * Props for LocationCard component.
 */
export interface LocationCardProps {
  city: string;
  cityError?: AppError;
  onCityChange: (nextCity: string) => void;
}

const CITY_INPUT_ID = 'profile-city-input';
const CITY_HINT_ID = 'profile-city-hint';
const CITY_ERROR_ID = 'profile-city-error';

/**
 * Location card capturing city input with accessible inline validation messaging.
 */
export function LocationCard({ city, cityError, onCityChange }: LocationCardProps): ReactElement {
  const cityDescribedBy = cityError ? `${CITY_HINT_ID} ${CITY_ERROR_ID}` : CITY_HINT_ID;

  return (
    <SectionCard title={UI_COPY.LOCATION_CARD_TITLE} icon={<LocationIcon />}>
      <div className="space-y-1.5 text-sm">
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
          placeholder={UI_LABELS.CITY_PLACEHOLDER}
          aria-invalid={Boolean(cityError)}
          aria-describedby={cityDescribedBy}
          onChange={(event) => onCityChange(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-2xs transition-colors duration-150 placeholder:text-slate-400 focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-teal-400"
        />
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
