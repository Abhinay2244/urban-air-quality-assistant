import { describe, expect, it } from 'vitest';
import type { HourlyPm25Point } from '../../types/index.ts';
import { findBestOutdoorWindow } from '../../utils/outdoorWindow.ts';

describe('findBestOutdoorWindow', () => {
  it('finds the lowest-exposure continuous window across hourly PM2.5 data', () => {
    const hourly: HourlyPm25Point[] = [
      { time: '2026-11-21T08:00', pm25: 190 },
      { time: '2026-11-21T09:00', pm25: 160 },
      { time: '2026-11-21T10:00', pm25: 90 },
      { time: '2026-11-21T11:00', pm25: 70 },
      { time: '2026-11-21T12:00', pm25: 140 },
    ];

    expect(findBestOutdoorWindow(hourly, 2)).toEqual({
      startTime: '2026-11-21T10:00',
      endTime: '2026-11-21T12:00',
      averagePm25: 80,
      durationHours: 2,
    });
  });

  it('computes endTime one hour past the last entry when the best window reaches the end', () => {
    const hourly: HourlyPm25Point[] = [
      { time: '2026-11-21T21:00', pm25: 200 },
      { time: '2026-11-21T22:00', pm25: 55.2 },
      { time: '2026-11-21T23:00', pm25: 44.8 },
    ];

    expect(findBestOutdoorWindow(hourly, 2)).toEqual({
      startTime: '2026-11-21T22:00',
      endTime: '2026-11-22T00:00',
      averagePm25: 50,
      durationHours: 2,
    });
  });

  it('returns null for empty, insufficient, or invalid inputs', () => {
    expect(findBestOutdoorWindow([], 2)).toBeNull();
    expect(findBestOutdoorWindow([{ time: '2026-11-21T10:00', pm25: 50 }], 2)).toBeNull();
    expect(findBestOutdoorWindow([{ time: '2026-11-21T10:00', pm25: 50 }], 0)).toBeNull();
    expect(
      findBestOutdoorWindow(
        [
          { time: '2026-11-21T10:00', pm25: Number.NaN },
          { time: '2026-11-21T11:00', pm25: 30 },
        ],
        2,
      ),
    ).toBeNull();
  });
});
