import type { KeyboardEvent } from 'react';
import { APP_TEXT } from '@shared/constants/config.ts';
import type { CitySearchResult } from '@shared/types/index.ts';

/** Returns accessible live-region announcement text for the number of city suggestions. */
export function formatSuggestionCount(count: number): string {
  if (count === 0) {
    return '';
  }
  if (count === 1) {
    return APP_TEXT.CITY_SUGGESTIONS_SINGLE;
  }
  return `${count} ${APP_TEXT.CITY_SUGGESTIONS_PLURAL_SUFFIX}`;
}

/** Handles keyboard navigation actions within the city autocomplete combobox. */
export function handleCityComboboxKeyDown(params: {
  event: KeyboardEvent<HTMLInputElement>;
  suggestions: readonly CitySearchResult[];
  isExpanded: boolean;
  clampedActiveIndex: number;
  setIsDismissed: (value: boolean) => void;
  setActiveIndex: (updater: number | ((prev: number) => number)) => void;
  onSelectSuggestion: (item: CitySearchResult) => void;
}): void {
  const {
    event,
    suggestions,
    isExpanded,
    clampedActiveIndex,
    setIsDismissed,
    setActiveIndex,
    onSelectSuggestion,
  } = params;
  if (suggestions.length === 0) {
    return;
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    setIsDismissed(false);
    setActiveIndex((prev) => (isExpanded ? (prev + 1) % suggestions.length : 0));
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    setIsDismissed(false);
    setActiveIndex((prev) => (!isExpanded || prev <= 0 ? suggestions.length - 1 : prev - 1));
    return;
  }
  if (event.key === 'Enter' && clampedActiveIndex >= 0) {
    event.preventDefault();
    const selected = suggestions[clampedActiveIndex];
    if (selected) {
      onSelectSuggestion(selected);
    }
    return;
  }
  if (event.key === 'Escape' && isExpanded) {
    event.preventDefault();
    setIsDismissed(true);
    setActiveIndex(-1);
  }
}
