import { describe, expect, it } from 'vitest';
import { UrgencyLevel } from '@shared/types/index.ts';
import { formatClockTime, formatPM25Value, formatUrgencyLabel } from '@shared/utils/formatting.ts';

describe('formatting utilities', () => {
  it('formats PM2.5 readings with units and guards negative numbers', () => {
    expect(formatPM25Value(42.56)).toBe('42.6 ug/m3');
    expect(formatPM25Value(-5)).toBe('0.0 ug/m3');
  });

  it('formats local hourly timestamps into 12-hour clock labels', () => {
    expect(formatClockTime('2026-11-21T00:00')).toBe('12:00 AM');
    expect(formatClockTime('2026-11-21T14:00')).toBe('2:00 PM');
  });

  it('maps urgency levels to readable labels', () => {
    expect(formatUrgencyLabel(UrgencyLevel.CRITICAL)).toBe('Urgent Priority');
    expect(formatUrgencyLabel(UrgencyLevel.HIGH)).toBe('High Priority');
    expect(formatUrgencyLabel(UrgencyLevel.STANDARD)).toBe('Standard');
  });
});
