import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_PROFILE } from '../../constants/config.ts';
import { SAFE_FALLBACK_ASSISTANT_RESPONSE } from '../../constants/prompts.ts';
import { RecommendationCategory } from '../../types/index.ts';
import { parseAndValidateAssistantResponse } from '../../utils/assistantParser.ts';
import { sanitizeText } from '../../utils/sanitizing.ts';
import { validateCity, validateUserProfile } from '../../utils/validation.ts';

describe('sanitizing and validation utilities', () => {
  it('strips script tags, HTML markup, and trims whitespace', () => {
    const dirty = '  <script>alert(1)</script><b>New   Delhi</b>  ';
    expect(sanitizeText(dirty)).toBe('New Delhi');
  });

  it('enforces length limit during sanitization', () => {
    const longInput = 'a'.repeat(120);
    expect(sanitizeText(longInput, 20)).toHaveLength(20);
  });

  it('rejects too-short cities and accepts sanitized valid cities', () => {
    const invalid = validateCity(' <p>A</p> ');
    expect(invalid.isValid).toBe(false);
    expect(invalid.error).toBeDefined();

    const valid = validateCity('  Lahore <b>City</b>  ');
    expect(valid.isValid).toBe(true);
    expect(valid.value).toBe('Lahore City');
  });

  it('validates and sanitizes a full UserProfile', () => {
    const result = validateUserProfile({
      ...DEFAULT_USER_PROFILE,
      city: '  Beijing<script>bad()</script> ',
    });
    expect(result.isValid).toBe(true);
    expect(result.value.city).toBe('Beijing');
  });

  it('parses valid AssistantResponse JSON and clamps PM2.5 reductions', () => {
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
  });

  it('falls back safely when Gemini JSON output is malformed', () => {
    const fallback = parseAndValidateAssistantResponse('{ invalid json');
    expect(fallback).toEqual(SAFE_FALLBACK_ASSISTANT_RESPONSE);
    expect(fallback.isFallback).toBe(true);
  });
});
