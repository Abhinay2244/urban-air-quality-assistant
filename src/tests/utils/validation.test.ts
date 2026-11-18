import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import { SAFE_FALLBACK_ASSISTANT_RESPONSE } from '../../constants/prompts.ts';
import { AQICategoryId, RecommendationCategory } from '../../types/index.ts';
import { parseAndValidateAssistantResponse, readStringField } from '../../utils/assistantParser.ts';
import { buildAssistantPrompt } from '../../utils/promptBuilder.ts';
import { sanitizeText } from '../../utils/sanitizing.ts';
import {
  isRecord,
  unwrapValidation,
  validateAQIData,
  validateCity,
  validateManualAqi,
  validateOptionalPm25,
  validateUserProfile,
} from '../../utils/validation.ts';

describe('sanitizing and validation utilities', () => {
  it('strips script tags, HTML markup, and trims whitespace', () => {
    expect(sanitizeText('  <script>alert(1)</script><b>New   Delhi</b>  ')).toBe('New Delhi');
    expect(sanitizeText('a'.repeat(120), 20)).toHaveLength(20);
  });

  it('rejects too-short cities and accepts sanitized valid cities', () => {
    expect(validateCity(' <p>A</p> ').isValid).toBe(false);
    const valid = validateCity('  Lahore <b>City</b>  ');
    expect(valid.isValid).toBe(true);
    expect(valid.value).toBe('Lahore City');
  });

  it('validates UserProfile and rejects invalid enums or non-boolean flags', () => {
    const valid = validateUserProfile({
      ...DEFAULT_USER_PROFILE,
      city: '  Beijing<script>bad()</script> ',
    });
    expect(valid.isValid).toBe(true);
    expect(valid.value.city).toBe('Beijing');

    const badEnum = validateUserProfile({ ...DEFAULT_USER_PROFILE, commuteMode: 'JETPACK' });
    expect(badEnum.isValid).toBe(false);

    const badFlag = validateUserProfile({ ...DEFAULT_USER_PROFILE, hasChildren: 'yes' });
    expect(badFlag.isValid).toBe(false);
  });

  it('validates AQIData, manual AQI, optional PM2.5, isRecord, and unwrapValidation', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord([1, 2])).toBe(false);
    expect(isRecord(null)).toBe(false);

    expect(
      validateAQIData({
        city: 'Delhi',
        country: 'IN',
        aqi: Number.NaN,
        pm25: 50,
        pm10: 80,
        no2: 20,
        o3: 15,
        category: AQICategoryId.UNHEALTHY,
        updatedAt: '2026-11-18T08:00:00Z',
      }),
    ).toBe(false);

    expect(validateManualAqi('250').isValid).toBe(true);
    expect(validateManualAqi('600').isValid).toBe(false);
    expect(validateOptionalPm25('').value).toBeUndefined();
    expect(validateOptionalPm25('-5').isValid).toBe(false);
    expect(() => unwrapValidation(validateCity('A'), 'bad city')).toThrow();
  });

  it('parses AssistantResponse safely and ignores non-string fields via readStringField', () => {
    expect(readStringField(12345, 50)).toBe('');
    expect(readStringField('<b>Keep calm</b>', 50)).toBe('Keep calm');

    const raw = JSON.stringify({
      summary: 'High PM2.5 indoors and outdoors.',
      priorityGuidance: 'Run HEPA filter continuously.',
      recommendations: [
        {
          title: 'Seal windows',
          category: RecommendationCategory.INDOOR_AIR,
          action: 'Apply weatherstripping to frames.',
          impactExplanation: 'Reduces outdoor smoke infiltration.',
          estimatedPM25Reduction: 140,
        },
      ],
    });
    const parsed = parseAndValidateAssistantResponse(raw);
    expect(parsed.isFallback).toBe(false);
    expect(parsed.recommendations[0].estimatedPM25Reduction).toBe(100);
    expect(parseAndValidateAssistantResponse('{ bad')).toEqual(SAFE_FALLBACK_ASSISTANT_RESPONSE);
  });

  it('builds sanitized prompts via promptBuilder', () => {
    const prompt = buildAssistantPrompt(DEFAULT_USER_PROFILE, {
      city: '<b>Lahore</b>',
      country: 'Pakistan',
      aqi: 220,
      pm25: 170,
      pm10: 240,
      no2: 40,
      o3: 20,
      category: AQICategoryId.VERY_UNHEALTHY,
      updatedAt: '2026-11-18T08:00:00Z',
    });
    expect(prompt).toContain('City: Lahore, Pakistan');
  });
});
