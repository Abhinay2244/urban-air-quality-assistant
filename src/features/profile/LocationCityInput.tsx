import type { KeyboardEvent, ReactElement } from 'react';
import { UI_LABELS } from '@shared/constants/config.ts';

/** Props for LocationCityInput component. */
export interface LocationCityInputProps {
  inputId: string;
  hintId: string;
  errorId: string;
  listboxId: string;
  activeOptionId: string | undefined;
  city: string;
  isExpanded: boolean;
  hasError: boolean;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/** Accessible ARIA combobox text input for selecting or typing an Indian city. */
export function LocationCityInput({
  inputId,
  hintId,
  errorId,
  listboxId,
  activeOptionId,
  city,
  isExpanded,
  hasError,
  onChange,
  onKeyDown,
}: Readonly<LocationCityInputProps>): ReactElement {
  return (
    <input
      id={inputId}
      type="text"
      role="combobox"
      value={city}
      autoComplete="off"
      placeholder={UI_LABELS.CITY_PLACEHOLDER}
      aria-autocomplete="list"
      aria-expanded={isExpanded}
      aria-controls={isExpanded ? listboxId : undefined}
      aria-activedescendant={activeOptionId}
      aria-invalid={hasError}
      aria-describedby={hasError ? `${hintId} ${errorId}` : hintId}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      onKeyDown={onKeyDown}
      className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-2xs transition-colors duration-150 placeholder:text-slate-600 focus:border-teal-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-teal-400"
    />
  );
}
