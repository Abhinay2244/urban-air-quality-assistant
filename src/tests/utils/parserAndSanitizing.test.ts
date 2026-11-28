import { describe, expect, it } from 'vitest';
import { SAFE_FALLBACK_ASSISTANT_RESPONSE } from '@shared/constants/prompts.ts';
import { AqiCategoryId } from '@shared/types/index.ts';
import { getAqiCategoryByValue, getAqiCategoryInfo } from '../../utils/aqiCalculations.ts';
import {
  parseAndValidateAssistantResponse,
  readStringField,
} from '@shared/utils/assistantParser.ts';
import { sanitizeAqiData, sanitizeText } from '@shared/utils/sanitizing.ts';

describe('assistantParser, sanitizing, and aqiCalculations branch coverage', () => {
  it('returns SAFE_FALLBACK_ASSISTANT_RESPONSE on non-object JSON or insufficient valid items', () => {
    expect(parseAndValidateAssistantResponse('"just a string"')).toEqual(
      SAFE_FALLBACK_ASSISTANT_RESPONSE,
    );
    expect(
      parseAndValidateAssistantResponse(
        JSON.stringify({
          summary: 'Summary',
          priorityGuidance: 'Priority',
          recommendations: [null, { title: 'Incomplete' }],
        }),
      ),
    ).toEqual(SAFE_FALLBACK_ASSISTANT_RESPONSE);
    expect(readStringField(12345, 50)).toBe('');
  });

  it('handles zero maxLength, non-string values, and sanitizeAqiData fallback fields', () => {
    expect(sanitizeText('hello', 0)).toBe('');
    expect(sanitizeText(42, 10)).toBe('');

    const sanitized = sanitizeAqiData(
      {
        city: '<b>X</b>',
        country: '<i>India</i>',
        stationName: '',
        locationWarning: '<script>alert(1)</script>Far station',
        aqi: 150,
        pm25: 60,
        no2: 10,
        o3: 15,
        category: AqiCategoryId.UNHEALTHY_SENSITIVE,
        updatedAt: '',
        source: 'live',
      },
      'Delhi',
    );
    expect(sanitized.city).toBe('Delhi');
    expect(sanitized.country).toBe('India');
    expect(sanitized.stationName).toBeUndefined();
    expect(sanitized.locationWarning).toBe('Far station');
  });

  it('handles out-of-range AQI and unknown category ID fallbacks cleanly', () => {
    expect(getAqiCategoryByValue(999).id).toBe(AqiCategoryId.HAZARDOUS);
    expect(getAqiCategoryInfo('invalid').id).toBe(AqiCategoryId.GOOD);
  });
});
