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

function computeWindowAverage(
  hourly: readonly HourlyPm25Point[],
  start: number,
  durationHours: number,
): number | null {
  let sum = 0;
  for (let offset = 0; offset < durationHours; offset += 1) {
    const point = hourly[start + offset];
    if (
      !point ||
      typeof point.pm25 !== 'number' ||
      !Number.isFinite(point.pm25) ||
      point.pm25 < 0
    ) {
      return null;
    }
    sum += point.pm25;
  }
  return sum / durationHours;
}

function resolveEndTime(
  hourly: readonly HourlyPm25Point[],
  endBoundaryIndex: number,
  fallbackTime: string,
): string {
  const endPoint = hourly[endBoundaryIndex];
  if (endPoint) {
    return endPoint.time;
  }
  const lastPoint = hourly[endBoundaryIndex - 1];
  return advanceOneHour(lastPoint ? lastPoint.time : fallbackTime);
}

/**
 * Finds the continuous `durationHours` window with the lowest average PM2.5 concentration.
 * Returns null if forecast data is empty, shorter than `durationHours`, or invalid.
 */
export function findBestOutdoorWindow(
  hourly: readonly HourlyPm25Point[],
  durationHours: number,
): OutdoorWindow | null {
  if (!Number.isInteger(durationHours) || durationHours < 1 || hourly.length < durationHours) {
    return null;
  }

  let bestStartIndex = -1;
  let bestAverage = Number.POSITIVE_INFINITY;

  for (let start = 0; start <= hourly.length - durationHours; start += 1) {
    const average = computeWindowAverage(hourly, start, durationHours);
    if (average !== null && average < bestAverage) {
      bestAverage = average;
      bestStartIndex = start;
    }
  }

  const startPoint = bestStartIndex >= 0 ? hourly[bestStartIndex] : undefined;
  if (!startPoint) {
    return null;
  }

  return {
    startTime: startPoint.time,
    endTime: resolveEndTime(hourly, bestStartIndex + durationHours, startPoint.time),
    averagePm25: Math.round(bestAverage * DECIMAL_ROUND_FACTOR) / DECIMAL_ROUND_FACTOR,
    durationHours,
  };
}
