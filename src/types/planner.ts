/** Geographic latitude/longitude pair used for coordinate-based AQI lookups. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** Indian city autocomplete candidate returned by Open-Meteo geocoding. */
export interface CitySearchResult {
  name: string;
  admin1?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
}

/** Lowest-exposure continuous outdoor window computed from hourly PM2.5 readings. */
export interface OutdoorWindow {
  startTime: string;
  endTime: string;
  averagePm25: number;
  durationHours: number;
}

/** Time-of-day identifier for daily plan exposure slots. */
export type DaySlotId = 'morning' | 'afternoon' | 'evening';

/** Morning, afternoon, or evening schedule slot derived from hourly PM2.5 forecasts. */
export interface DailyPlanSlot {
  id: DaySlotId;
  label: string;
  timeRange: string;
  averagePm25: number;
  action: string;
}
