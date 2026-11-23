import { describe, expect, it } from 'vitest';
import { SLOT_ACTION_COPY } from '../../constants/dailyPlan.ts';
import { buildDailyPlanSlots } from '../../utils/dailyPlan.ts';

describe('buildDailyPlanSlots', () => {
  it('aggregates hourly PM2.5 readings into Morning, Afternoon, and Evening slots', () => {
    const slots = buildDailyPlanSlots([
      { time: '2026-11-22T07:00', pm25: 170 },
      { time: '2026-11-22T09:00', pm25: 150 },
      { time: '2026-11-22T13:00', pm25: 30 },
      { time: '2026-11-22T14:00', pm25: 40 },
      { time: '2026-11-22T18:00', pm25: 90 },
      { time: '2026-11-22T20:00', pm25: 110 },
    ]);

    expect(slots).toHaveLength(3);
    expect(slots[0]).toMatchObject({
      id: 'morning',
      label: 'Morning',
      averagePm25: 160,
      action: SLOT_ACTION_COPY.SEVERE,
    });
    expect(slots[1]).toMatchObject({
      id: 'afternoon',
      label: 'Afternoon',
      averagePm25: 35,
      action: SLOT_ACTION_COPY.LOW,
    });
    expect(slots[2]).toMatchObject({
      id: 'evening',
      label: 'Evening',
      averagePm25: 100,
      action: SLOT_ACTION_COPY.HIGH,
    });
  });

  it('ignores invalid readings and omits empty time-of-day buckets', () => {
    const slots = buildDailyPlanSlots([
      { time: '2026-11-22T02:00', pm25: 120 },
      { time: '2026-11-22T15:00', pm25: 45 },
      { time: '2026-11-22T16:00', pm25: Number.NaN },
    ]);

    expect(slots).toHaveLength(1);
    expect(slots[0].id).toBe('afternoon');
    expect(slots[0].averagePm25).toBe(45);
    expect(slots[0].action).toBe(SLOT_ACTION_COPY.MODERATE);
  });

  it('returns empty array when hourly forecast data is empty', () => {
    expect(buildDailyPlanSlots([])).toEqual([]);
  });
});
