import { describe, expect, it } from 'vitest';
import {
  AQI_CATEGORIES,
  MAX_STANDARD_AQI,
  MIN_STANDARD_AQI,
  WHO_PM10_GUIDELINE_UG_M3,
  WHO_PM25_GUIDELINE_UG_M3,
} from '@shared/constants/aqi.ts';
import { AqiCategoryId } from '@shared/types/index.ts';
import { getAqiCategoryByValue } from '../../utils/aqiCalculations.ts';

describe('US EPA AQI constants and category resolution', () => {
  it('defines all six US EPA AQI categories in ascending order', () => {
    expect(AQI_CATEGORIES).toHaveLength(6);
    expect(AQI_CATEGORIES.map((c) => c.label)).toEqual([
      'Good',
      'Moderate',
      'Unhealthy for Sensitive Groups',
      'Unhealthy',
      'Very Unhealthy',
      'Hazardous',
    ]);
  });

  it('covers contiguous integer breakpoints from 0 to 500 and defines WHO 24h guidelines', () => {
    expect(AQI_CATEGORIES[0].minAqi).toBe(MIN_STANDARD_AQI);
    expect(AQI_CATEGORIES[AQI_CATEGORIES.length - 1]?.maxAqi).toBe(MAX_STANDARD_AQI);
    expect(WHO_PM25_GUIDELINE_UG_M3).toBe(15);
    expect(WHO_PM10_GUIDELINE_UG_M3).toBe(45);

    for (let index = 1; index < AQI_CATEGORIES.length; index += 1) {
      const current = AQI_CATEGORIES[index];
      const previous = AQI_CATEGORIES[index - 1];
      expect(current).toBeDefined();
      expect(previous).toBeDefined();
      if (current && previous) {
        expect(current.minAqi).toBe(previous.maxAqi + 1);
      }
    }
  });

  it('resolves boundary and above-500 AQI values to the correct US EPA category', () => {
    expect(getAqiCategoryByValue(25).id).toBe(AqiCategoryId.GOOD);
    expect(getAqiCategoryByValue(75).id).toBe(AqiCategoryId.MODERATE);
    expect(getAqiCategoryByValue(125).id).toBe(AqiCategoryId.UNHEALTHY_SENSITIVE);
    expect(getAqiCategoryByValue(175).id).toBe(AqiCategoryId.UNHEALTHY);
    expect(getAqiCategoryByValue(250).id).toBe(AqiCategoryId.VERY_UNHEALTHY);
    expect(getAqiCategoryByValue(350).id).toBe(AqiCategoryId.HAZARDOUS);
    expect(getAqiCategoryByValue(640).id).toBe(AqiCategoryId.HAZARDOUS);
  });
});
