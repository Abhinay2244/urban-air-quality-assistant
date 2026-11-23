/**
 * @module constants/dailyPlan
 * Responsibility: Define time-of-day planner buckets and PM2.5 exposure action thresholds.
 * Must not contain date parsing logic, UI rendering, or network calls.
 */
import type { DaySlotId } from '../types/index.ts';

/**
 * Hour boundaries and display metadata for morning, afternoon, and evening plan slots.
 */
export const DAILY_PLAN_SLOTS: ReadonlyArray<{
  id: DaySlotId;
  label: string;
  timeRange: string;
  startHour: number;
  endHourExclusive: number;
}> = [
  {
    id: 'morning',
    label: 'Morning',
    timeRange: '6 AM – 12 PM',
    startHour: 6,
    endHourExclusive: 12,
  },
  {
    id: 'afternoon',
    label: 'Afternoon',
    timeRange: '12 PM – 5 PM',
    startHour: 12,
    endHourExclusive: 17,
  },
  {
    id: 'evening',
    label: 'Evening',
    timeRange: '5 PM – 10 PM',
    startHour: 17,
    endHourExclusive: 22,
  },
];

/**
 * Hourly PM2.5 thresholds (ug/m3) driving slot-level commute and activity guidance.
 */
export const SLOT_PM25_THRESHOLDS = {
  LOW_MAX: 35,
  MODERATE_MAX: 55,
  HIGH_MAX: 150,
} as const;

/**
 * Action guidance templates selected for each daily plan time slot.
 */
export const SLOT_ACTION_COPY = {
  LOW: 'Good slot for outdoor commute, school runs, or outdoor sports with light monitoring.',
  MODERATE: 'Prefer low-intensity outdoor activity; wear a fitted N95/KF94 along busy roads.',
  HIGH: 'Move sports/PT indoors, prefer enclosed metro or transit, and wear a fitted N95 outside.',
  SEVERE: 'Avoid outdoor exertion; keep windows sealed and run indoor filtration.',
} as const;
