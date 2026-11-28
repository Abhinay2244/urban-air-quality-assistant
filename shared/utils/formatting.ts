/**
 * @module utils/formatting
 * Responsibility: Format pollutant metrics, timestamps, and urgency labels for display.
 * Must not perform validation, network calls, or React state updates.
 */
import { APP_TEXT } from '../constants/config.ts';
import { UrgencyLevel } from '../types/index.ts';

const DECIMAL_PLACES = 1;

const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  [UrgencyLevel.CRITICAL]: 'Urgent Priority',
  [UrgencyLevel.HIGH]: 'High Priority',
  [UrgencyLevel.STANDARD]: 'Standard',
};

/**
 * Formats a PM2.5 reading with standard concentration units.
 */
export function formatPM25Value(value: number): string {
  const safeValue = Number.isFinite(value) && value >= 0 ? value : 0;
  return `${safeValue.toFixed(DECIMAL_PLACES)} ${APP_TEXT.PM25_UNIT}`;
}

/**
 * Formats an ISO timestamp string into a concise local date/time string.
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return date.toLocaleString();
}

/**
 * Formats an ISO or local YYYY-MM-DDTHH:mm timestamp into a concise 12-hour clock label.
 */
export function formatClockTime(timestamp: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(timestamp);
  if (match) {
    const hour24 = Number(match[1]);
    const minute = match[2];
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${hour12}:${minute} ${period}`;
  }
  return formatTimestamp(timestamp);
}

/**
 * Maps an UrgencyLevel value to a human-readable label.
 */
export function formatUrgencyLabel(urgency: UrgencyLevel): string {
  return URGENCY_LABELS[urgency];
}
