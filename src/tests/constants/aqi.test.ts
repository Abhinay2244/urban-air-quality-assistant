import { describe, expect, it } from 'vitest';
import { AQI_CATEGORIES, MAX_STANDARD_AQI, MIN_STANDARD_AQI } from '../../constants/aqi.ts';
import { AQICategoryId } from '../../types/index.ts';
import { getAQICategoryByValue } from '../../utils/aqiCalculations.ts';

describe('AQI constants and category resolution', () => {
  it('defines all six standard EPA categories in ascending order', () => {
    expect(AQI_CATEGORIES).toHaveLength(6);
    expect(AQI_CATEGORIES[0].id).toBe(AQICategoryId.GOOD);
    expect(AQI_CATEGORIES[AQI_CATEGORIES.length - 1].id).toBe(AQICategoryId.HAZARDOUS);
  });

  it('covers contiguous integer breakpoints from 0 to 500', () => {
    expect(AQI_CATEGORIES[0].minAqi).toBe(MIN_STANDARD_AQI);
    expect(AQI_CATEGORIES[AQI_CATEGORIES.length - 1].maxAqi).toBe(MAX_STANDARD_AQI);

    for (let index = 1; index < AQI_CATEGORIES.length; index += 1) {
      expect(AQI_CATEGORIES[index].minAqi).toBe(AQI_CATEGORIES[index - 1].maxAqi + 1);
    }
  });

  it('resolves boundary AQI values to the correct category', () => {
    expect(getAQICategoryByValue(25).id).toBe(AQICategoryId.GOOD);
    expect(getAQICategoryByValue(100).id).toBe(AQICategoryId.MODERATE);
    expect(getAQICategoryByValue(135).id).toBe(AQICategoryId.UNHEALTHY_SENSITIVE);
    expect(getAQICategoryByValue(180).id).toBe(AQICategoryId.UNHEALTHY);
    expect(getAQICategoryByValue(250).id).toBe(AQICategoryId.VERY_UNHEALTHY);
    expect(getAQICategoryByValue(450).id).toBe(AQICategoryId.HAZARDOUS);
  });
});
