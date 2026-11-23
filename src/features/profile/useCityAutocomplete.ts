import { useCallback, useEffect, useState } from 'react';
import { INPUT_LIMITS } from '../../constants/limits.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import { searchIndianCitiesClient } from '../../services/citySearchService.ts';
import type { CitySearchResult, Coordinates } from '../../types/index.ts';

/**
 * State and actions managing India-only city autocomplete and browser Geolocation permission flow.
 */
export interface UseCityAutocompleteResult {
  suggestions: CitySearchResult[];
  isSearching: boolean;
  isLocating: boolean;
  geoMessage: string | null;
  clearSuggestions: () => void;
  triggerCitySearch: (query: string) => void;
  requestBrowserLocation: (onCoords: (coords: Coordinates) => void) => void;
}

const GEO_PERMISSION_DENIED_CODE = 1;

/**
 * Manages debounced India-only city suggestions via /api/cities and Geolocation API state.
 */
export function useCityAutocomplete(): UseCityAutocompleteResult {
  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

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

  const requestBrowserLocation = useCallback((onCoords: (coords: Coordinates) => void): void => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoMessage(UI_COPY.GEOLOCATION_UNAVAILABLE);
      return;
    }

    setIsLocating(true);
    setGeoMessage(UI_COPY.GEOLOCATION_REQUESTING);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setGeoMessage(null);
        onCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (geoError) => {
        setIsLocating(false);
        setGeoMessage(
          geoError.code === GEO_PERMISSION_DENIED_CODE
            ? UI_COPY.GEOLOCATION_DENIED
            : UI_COPY.GEOLOCATION_UNAVAILABLE,
        );
      },
      { timeout: INPUT_LIMITS.GEOLOCATION_TIMEOUT_MS },
    );
  }, []);

  return {
    suggestions,
    isSearching,
    isLocating,
    geoMessage,
    clearSuggestions,
    triggerCitySearch,
    requestBrowserLocation,
  };
}
