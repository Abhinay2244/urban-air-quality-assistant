import { useCallback, useEffect, useState } from 'react';
import { INPUT_LIMITS } from '../../constants/limits.ts';
import { searchIndianCitiesClient } from '../../services/citySearchService.ts';
import type { CitySearchResult } from '../../types/index.ts';

/**
 * State and actions managing India-only city autocomplete suggestions.
 */
export interface UseCityAutocompleteResult {
  suggestions: CitySearchResult[];
  isSearching: boolean;
  clearSuggestions: () => void;
  triggerCitySearch: (query: string) => void;
}

/**
 * Manages debounced India-only city suggestions via /api/cities.
 */
export function useCityAutocomplete(): UseCityAutocompleteResult {
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const clearSuggestions = useCallback((): void => {
    setQuery('');
    setSuggestions([]);
  }, []);

  const triggerCitySearch = useCallback((nextQuery: string): void => {
    const trimmed = nextQuery.trim();
    if (trimmed.length < INPUT_LIMITS.MIN_CITY_LENGTH) {
      setQuery('');
      setSuggestions([]);
      return;
    }
    setQuery(trimmed);
  }, []);

  useEffect(() => {
    if (query.length < INPUT_LIMITS.MIN_CITY_LENGTH) {
      return;
    }
    const controller = new AbortController();
    const timerId = window.setTimeout(() => {
      setIsSearching(true);
      void searchIndianCitiesClient(query, controller.signal)
        .then((cities) => {
          if (!controller.signal.aborted) {
            setSuggestions(cities);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, INPUT_LIMITS.CITY_SEARCH_DEBOUNCE_MS);

    return (): void => {
      window.clearTimeout(timerId);
      controller.abort();
    };
  }, [query]);

  return {
    suggestions,
    isSearching,
    clearSuggestions,
    triggerCitySearch,
  };
}
