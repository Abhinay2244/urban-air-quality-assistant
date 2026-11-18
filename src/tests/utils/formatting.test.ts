import { describe, expect, it } from 'vitest';
import { formatPM25Value, formatUrgencyLabel } from '../../utils/formatting.ts';
import { UrgencyLevel } from '../../types/index.ts';

describe('formatting utilities', () => {
  it('formats PM2.5 readings with units and guards negative numbers', () => {
    expect(formatPM25Value(42.56)).toBe('42.6 ug/m3');
    expect(formatPM25Value(-5)).toBe('0.0 ug/m3');
  });

  it('maps urgency levels to readable labels', () => {
    expect(formatUrgencyLabel(UrgencyLevel.CRITICAL)).toBe('Urgent Priority');
    expect(formatUrgencyLabel(UrgencyLevel.HIGH)).toBe('High Priority');
    expect(formatUrgencyLabel(UrgencyLevel.STANDARD)).toBe('Standard');
  });
});
