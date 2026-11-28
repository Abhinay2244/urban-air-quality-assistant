import type { ReactElement } from 'react';
import { UI_LABELS } from '@shared/constants/config.ts';
import type { CitySearchResult } from '@shared/types/index.ts';

/**
 * Props for CitySuggestionsList accessible ARIA listbox component.
 */
export interface CitySuggestionsListProps {
  listboxId: string;
  suggestions: readonly CitySearchResult[];
  activeIndex: number;
  getOptionId: (index: number) => string;
  onSelect: (result: CitySearchResult) => void;
}

/**
 * Accessible ARIA listbox displaying matching Indian cities for the LocationCard combobox.
 */
export function CitySuggestionsList({
  listboxId,
  suggestions,
  activeIndex,
  getOptionId,
  onSelect,
}: Readonly<CitySuggestionsListProps>): ReactElement {
  return (
    <ul
      id={listboxId}
      role="listbox"
      aria-label={UI_LABELS.CITY_SUGGESTIONS_LABEL}
      className="max-h-48 divide-y divide-slate-200 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-950"
    >
      {suggestions.map((item, index) => {
        const isSelected = index === activeIndex;
        const activeClasses = isSelected
          ? 'bg-teal-50 text-teal-950 dark:bg-slate-900 dark:text-teal-200'
          : 'text-slate-900 hover:bg-teal-50 dark:text-slate-100 dark:hover:bg-slate-900';

        return (
          <li
            key={`${item.name}-${item.latitude}-${item.longitude}`}
            id={getOptionId(index)}
            role="option"
            aria-selected={isSelected}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              onSelect(item);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(item);
              }
            }}
            className={`flex min-h-11 w-full cursor-pointer items-center justify-between px-3.5 py-2 text-left text-sm transition-colors duration-150 ${activeClasses}`}
          >
            <span className="font-medium">{item.name}</span>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {item.admin1 ? `${item.admin1}, ${item.country}` : item.country}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
