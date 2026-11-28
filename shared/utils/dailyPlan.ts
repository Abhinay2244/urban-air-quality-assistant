/**
 * @module utils/dailyPlan
 * Responsibility: Group 24-hour PM2.5 readings into morning, afternoon, and evening plan slots.
 * Must not perform network calls, UI rendering, or React state updates.
 */
import {
  DAILY_PLAN_SLOTS,
  SLOT_ACTION_COPY,
  SLOT_PM25_THRESHOLDS,
} from '../constants/dailyPlan.ts';
import type { DailyPlanSlot, HourlyPm25Point } from '../types/index.ts';

const DECIMAL_ROUND_FACTOR = 10;
const HOUR_PATTERN = /T(\d{2}):\d{2}/;

function extractHour(timestamp: string): number | null {
  const match = HOUR_PATTERN.exec(timestamp);
  if (match) {
    const hour = Number(match[1]);
    return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.getHours();
}

function selectSlotAction(averagePm25: number): string {
  if (averagePm25 <= SLOT_PM25_THRESHOLDS.LOW_MAX) {
    return SLOT_ACTION_COPY.LOW;
  }
  if (averagePm25 <= SLOT_PM25_THRESHOLDS.MODERATE_MAX) {
    return SLOT_ACTION_COPY.MODERATE;
  }
  if (averagePm25 <= SLOT_PM25_THRESHOLDS.HIGH_MAX) {
    return SLOT_ACTION_COPY.HIGH;
  }
  return SLOT_ACTION_COPY.SEVERE;
}

/**
 * Aggregates hourly PM2.5 readings into Morning, Afternoon, and Evening action slots.
 * Returns only slots with valid readings, or an empty array when hourly data is missing/invalid.
 */
export function buildDailyPlanSlots(hourly: readonly HourlyPm25Point[]): DailyPlanSlot[] {
  if (hourly.length === 0) {
    return [];
  }

  const slots: DailyPlanSlot[] = [];
  for (const config of DAILY_PLAN_SLOTS) {
    const matching = hourly.filter((point: HourlyPm25Point) => {
      if (typeof point.pm25 !== 'number' || !Number.isFinite(point.pm25) || point.pm25 < 0) {
        return false;
      }
      const hour = extractHour(point.time);
      return hour !== null && hour >= config.startHour && hour < config.endHourExclusive;
    });

    if (matching.length === 0) {
      continue;
    }

    const total = matching.reduce((sum, point) => sum + point.pm25, 0);
    const averagePm25 =
      Math.round((total / matching.length) * DECIMAL_ROUND_FACTOR) / DECIMAL_ROUND_FACTOR;

    slots.push({
      id: config.id,
      label: config.label,
      timeRange: config.timeRange,
      averagePm25,
      action: selectSlotAction(averagePm25),
    });
  }

  return slots;
}
