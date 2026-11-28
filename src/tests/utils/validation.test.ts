import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_PROFILE } from '@shared/constants/config.ts';
import {
  ASSISTANT_SYSTEM_INSTRUCTION,
  SAFE_FALLBACK_ASSISTANT_RESPONSE,
} from '@shared/constants/prompts.ts';
import { AqiCategoryId, FamilyType, RecommendationCategory } from '@shared/types/index.ts';
import {
  parseAndValidateAssistantResponse,
  readStringField,
} from '@shared/utils/assistantParser.ts';
import { buildAssistantPrompt } from '@shared/utils/promptBuilder.ts';
import { sanitizeText } from '@shared/utils/sanitizing.ts';
import { isOneOf, isRecord } from '@shared/utils/typeGuards.ts';
import {
  unwrapValidation,
  validateAqiData,
  validateCity,
  validateManualAqi,
  validateOptionalPm10,
  validateOptionalPm25,
  validateUserProfile,
} from '@shared/utils/validation.ts';

describe('sanitizing and validation utilities', () => {
  it('strips script tags, HTML markup, and trims whitespace', () => {
    expect(sanitizeText('  <script>alert(1)</script><b>New   Delhi</b>  ')).toBe('New Delhi');
    expect(sanitizeText('a'.repeat(120), 20)).toHaveLength(20);
  });

  it('rejects too-short cities and accepts sanitized valid cities', () => {
    expect(validateCity(' <p>A</p> ').isValid).toBe(false);
    const valid = validateCity('  Lucknow <b>City</b>  ');
    expect(valid.isValid).toBe(true);
    expect(valid.value).toBe('Lucknow City');
  });

  it('validates UserProfile including Working Professional and Student and rejects invalid enums', () => {
    const valid = validateUserProfile({
      ...DEFAULT_USER_PROFILE,
      familyType: FamilyType.STUDENT,
      city: '  Kolkata<script>bad()</script> ',
    });
    expect(valid.isValid).toBe(true);
    expect(valid.value.city).toBe('Kolkata');
    expect(validateUserProfile({ ...DEFAULT_USER_PROFILE, commuteMode: 'JETPACK' }).isValid).toBe(
      false,
    );
    expect(validateUserProfile({ ...DEFAULT_USER_PROFILE, hasChildren: 'yes' }).isValid).toBe(
      false,
    );
  });

  it('accepts live AQI above 500 in validateAqiData while limiting manual AQI to 0-500', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord([1, 2])).toBe(false);
    expect(isOneOf('GOOD', Object.values(AqiCategoryId))).toBe(true);
    expect(isOneOf('INVALID', Object.values(AqiCategoryId))).toBe(false);

    const liveAqi = {
      city: 'Delhi',
      country: 'India',
      stationName: 'Anand Vihar, Delhi',
      provider: 'waqi',
      aqi: 640,
      pm25: 420,
      no2: 65,
      o3: 15,
      category: AqiCategoryId.HAZARDOUS,
      updatedAt: '2026-11-18T08:00:00Z',
    };
    expect(validateAqiData(liveAqi)).toBe(true);
    expect(validateAqiData({ ...liveAqi, aqi: Number.NaN })).toBe(false);

    expect(validateManualAqi('250').isValid).toBe(true);
    expect(validateManualAqi('600').isValid).toBe(false);
    expect(validateOptionalPm25('').value).toBeUndefined();
    expect(validateOptionalPm25('-5').isValid).toBe(false);
    expect(validateOptionalPm10('').value).toBeUndefined();
    expect(validateOptionalPm10('2500').isValid).toBe(false);
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
    expect(parsed.recommendations[0]?.estimatedPM25Reduction).toBe(100);
    expect(parseAndValidateAssistantResponse('{ bad')).toEqual(SAFE_FALLBACK_ASSISTANT_RESPONSE);
  });

  it('builds sanitized prompts with data-integrity instruction, Student focus, PM10, and Today slots', () => {
    expect(ASSISTANT_SYSTEM_INSTRUCTION.toLowerCase()).toContain('never invent');
    const prompt = buildAssistantPrompt(
      { ...DEFAULT_USER_PROFILE, familyType: FamilyType.STUDENT },
      {
        city: '<b>Kolkata</b>',
        country: 'India',
        provider: 'open-meteo',
        aqi: 220,
        pm25: 170,
        pm10: 240,
        no2: 40,
        o3: 20,
        category: AqiCategoryId.VERY_UNHEALTHY,
        updatedAt: '2026-11-18T08:00:00Z',
        hourlyPm25: [
          { time: '2026-11-21T08:00', pm25: 140 },
          { time: '2026-11-21T13:00', pm25: 70 },
          { time: '2026-11-21T14:00', pm25: 80 },
        ],
      },
    );
    expect(prompt).toContain('City: Kolkata, India');
    expect(prompt).toContain('US scale');
    expect(prompt).toContain('PM10=240');
    expect(prompt).toContain("Today's Hourly Plan Slots");
    expect(prompt).toContain('Morning (6 AM – 12 PM)');
    expect(prompt).toContain('Best 24h Outdoor Window: 1:00 PM to 3:00 PM');
    expect(prompt).toContain('Student:');
  });
});
