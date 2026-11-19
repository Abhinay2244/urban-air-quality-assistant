import { describe, expect, it } from 'vitest';
import { AQI_CATEGORIES, MAX_STANDARD_AQI, MIN_STANDARD_AQI } from '../../constants/aqi.ts';
import { AqiCategoryId } from '../../types/index.ts';
import { getAqiCategoryByValue } from '../../utils/aqiCalculations.ts';

describe('AQI constants and category resolution', () => {
  it('defines all six standard EPA categories in ascending order', () => {
    expect(AQI_CATEGORIES).toHaveLength(6);
    expect(AQI_CATEGORIES[0].id).toBe(AqiCategoryId.GOOD);
    expect(AQI_CATEGORIES[AQI_CATEGORIES.length - 1].id).toBe(AqiCategoryId.HAZARDOUS);
  });

  it('covers contiguous integer breakpoints from 0 to 500', () => {
    expect(AQI_CATEGORIES[0].minAqi).toBe(MIN_STANDARD_AQI);
    expect(AQI_CATEGORIES[AQI_CATEGORIES.length - 1].maxAqi).toBe(MAX_STANDARD_AQI);

    for (let index = 1; index < AQI_CATEGORIES.length; index += 1) {
      expect(AQI_CATEGORIES[index].minAqi).toBe(AQI_CATEGORIES[index - 1].maxAqi + 1);
    }
  });

  it('resolves boundary AQI values to the correct category', () => {
    expect(getAqiCategoryByValue(25).id).toBe(AqiCategoryId.GOOD);
    expect(getAqiCategoryByValue(100).id).toBe(AqiCategoryId.MODERATE);
    expect(getAqiCategoryByValue(135).id).toBe(AqiCategoryId.UNHEALTHY_SENSITIVE);
    expect(getAqiCategoryByValue(180).id).toBe(AqiCategoryId.UNHEALTHY);
    expect(getAqiCategoryByValue(250).id).toBe(AqiCategoryId.VERY_UNHEALTHY);
    expect(getAqiCategoryByValue(450).id).toBe(AqiCategoryId.HAZARDOUS);
  });
});
