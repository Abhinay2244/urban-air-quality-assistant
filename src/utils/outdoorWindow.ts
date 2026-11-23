/**
 * @module utils/outdoorWindow
 * Responsibility: Compute the lowest-exposure continuous outdoor activity window from hourly PM2.5 data.
 * Must not perform network calls, UI rendering, or React state updates.
 */
import type { HourlyPm25Point, OutdoorWindow } from '../types/index.ts';

const DECIMAL_ROUND_FACTOR = 10;
const MS_PER_HOUR = 3_600_000;
const LOCAL_HOUR_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function advanceOneHour(timestamp: string): string {
  const localMatch = LOCAL_HOUR_PATTERN.exec(timestamp);
  if (localMatch) {
    const [, year, month, day, hour, minute] = localMatch;
    const utcMs = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    );
    const next = new Date(utcMs + MS_PER_HOUR);
    return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}T${pad2(next.getUTCHours())}:${pad2(next.getUTCMinutes())}`;
  }

  const parsedMs = Date.parse(timestamp);
  if (!Number.isNaN(parsedMs)) {
    return new Date(parsedMs + MS_PER_HOUR).toISOString();
  }
  return timestamp;
}

/**
 * Finds the continuous `durationHours` window with the lowest average PM2.5 concentration.
 * Returns null if forecast data is empty, shorter than `durationHours`, or invalid.
 */
export function findBestOutdoorWindow(
  hourly: readonly HourlyPm25Point[],
  durationHours: number,
): OutdoorWindow | null {
  if (!Array.isArray(hourly) || !Number.isInteger(durationHours) || durationHours < 1) {
    return null;
  }
  if (hourly.length < durationHours) {
    return null;
  }

  let bestStartIndex = -1;
  let bestAverage = Number.POSITIVE_INFINITY;

  for (let start = 0; start <= hourly.length - durationHours; start += 1) {
    let sum = 0;
    let validWindow = true;

    for (let offset = 0; offset < durationHours; offset += 1) {
      const value = hourly[start + offset]?.pm25;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        validWindow = false;
        break;
      }
      sum += value;
    }

    if (validWindow) {
      const average = sum / durationHours;
      if (average < bestAverage) {
        bestAverage = average;
        bestStartIndex = start;
      }
    }
  }

  if (bestStartIndex === -1) {
    return null;
  }

  const endBoundaryIndex = bestStartIndex + durationHours;
  const endTime =
    endBoundaryIndex < hourly.length
      ? hourly[endBoundaryIndex].time
      : advanceOneHour(hourly[endBoundaryIndex - 1].time);

  return {
    startTime: hourly[bestStartIndex].time,
    endTime,
    averagePm25: Math.round(bestAverage * DECIMAL_ROUND_FACTOR) / DECIMAL_ROUND_FACTOR,
    durationHours,
  };
}
