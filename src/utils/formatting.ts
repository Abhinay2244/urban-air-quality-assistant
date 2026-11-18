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
 * Maps an UrgencyLevel value to a human-readable label.
 */
export function formatUrgencyLabel(urgency: UrgencyLevel): string {
  return URGENCY_LABELS[urgency];
}
