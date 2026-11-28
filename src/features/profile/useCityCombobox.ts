import { type KeyboardEvent, useState } from 'react';
import type { CitySearchResult } from '@shared/types/index.ts';
import { useCityAutocomplete } from '../../hooks/useCityAutocomplete.ts';
import { handleCityComboboxKeyDown } from './cityComboboxHelpers.ts';

/** State and handlers driving the India city combobox UI. */
export interface CityComboboxControl {
  suggestions: readonly CitySearchResult[];
  isExpanded: boolean;
  clampedActiveIndex: number;
  handleChange: (nextValue: string) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  handleSelectSuggestion: (item: CitySearchResult) => void;
}

/** Manages ARIA combobox open/selection state around city autocomplete suggestions. */
export function useCityCombobox(
  onCityChange: (nextCity: string) => void,
  onSelectCityResult?: (result: CitySearchResult) => void,
): CityComboboxControl {
  const { suggestions, clearSuggestions, triggerCitySearch } = useCityAutocomplete();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const isExpanded = !isDismissed && suggestions.length > 0;
  const clampedActiveIndex =
    isExpanded && activeIndex >= 0 && activeIndex < suggestions.length ? activeIndex : -1;

  const handleSelectSuggestion = (item: CitySearchResult): void => {
    clearSuggestions();
    setIsDismissed(false);
    setActiveIndex(-1);
    onCityChange(item.name);
    onSelectCityResult?.(item);
  };

  return {
    suggestions,
    isExpanded,
    clampedActiveIndex,
    handleChange: (nextValue) => {
      setIsDismissed(false);
      setActiveIndex(-1);
      onCityChange(nextValue);
      triggerCitySearch(nextValue);
    },
    handleKeyDown: (event) => {
      handleCityComboboxKeyDown({
        event,
        suggestions,
        isExpanded,
        clampedActiveIndex,
        setIsDismissed,
        setActiveIndex,
        onSelectSuggestion: handleSelectSuggestion,
      });
    },
    handleSelectSuggestion,
  };
}
