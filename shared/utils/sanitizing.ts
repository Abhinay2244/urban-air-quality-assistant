/**
 * @module utils/sanitizing
 * Responsibility: Strip HTML/script markup and control characters and bound text length safely.
 * Must not perform validation state updates, DOM manipulation, or network calls.
 */
import { INPUT_LIMITS } from '../constants/limits.ts';
import type { AqiData } from '../types/index.ts';

const SCRIPT_BLOCK_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const STYLE_BLOCK_PATTERN = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
const HTML_TAG_PATTERN = /<[^<>]*>/g;
const MULTI_SPACE_PATTERN = /\s+/g;
const MIN_PRINTABLE_ASCII_CODE = 32;
const DEL_ASCII_CODE = 127;

function stripControlCharacters(value: string): string {
  return Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= MIN_PRINTABLE_ASCII_CODE && code !== DEL_ASCII_CODE;
    })
    .join('');
}

/**
 * Strips script/style blocks, HTML tags, and control characters, trims,
 * and enforces a maximum character length on user or model text.
 */
export function sanitizeText(
  input: unknown,
  maxLength: number = INPUT_LIMITS.MAX_TEXT_LENGTH,
): string {
  if (typeof input !== 'string') {
    return '';
  }

  const withoutBlocks = input.replace(SCRIPT_BLOCK_PATTERN, ' ').replace(STYLE_BLOCK_PATTERN, ' ');
  const withoutTags = withoutBlocks.replace(HTML_TAG_PATTERN, ' ');
  const cleaned = stripControlCharacters(withoutTags).replace(MULTI_SPACE_PATTERN, ' ').trim();

  if (maxLength <= 0) {
    return '';
  }

  return cleaned.slice(0, maxLength);
}

function sanitizeOptionalAqiNumbers(
  data: AqiData,
): Pick<AqiData, 'pm10' | 'no2' | 'o3' | 'provider' | 'hourlyPm25' | 'source'> {
  return {
    ...(data.pm10 !== undefined ? { pm10: data.pm10 } : {}),
    ...(data.no2 !== undefined ? { no2: data.no2 } : {}),
    ...(data.o3 !== undefined ? { o3: data.o3 } : {}),
    ...(data.provider !== undefined ? { provider: data.provider } : {}),
    ...(data.hourlyPm25 !== undefined ? { hourlyPm25: data.hourlyPm25 } : {}),
    ...(data.source !== undefined ? { source: data.source } : {}),
  };
}

function sanitizeOptionalAqiStrings(
  data: AqiData,
): Pick<AqiData, 'stationName' | 'locationWarning' | 'updatedAt'> {
  const cleanStation = data.stationName
    ? sanitizeText(data.stationName, INPUT_LIMITS.MAX_TEXT_LENGTH)
    : undefined;
  const cleanWarning = data.locationWarning
    ? sanitizeText(data.locationWarning, INPUT_LIMITS.MAX_TEXT_LENGTH)
    : undefined;
  return {
    ...(cleanStation ? { stationName: cleanStation } : {}),
    ...(cleanWarning ? { locationWarning: cleanWarning } : {}),
    ...(data.updatedAt
      ? { updatedAt: sanitizeText(data.updatedAt, INPUT_LIMITS.MAX_CITY_LENGTH) }
      : {}),
  };
}

/**
 * Sanitizes free-text fields in validated AqiData (stripping HTML, trimming, and bounding length)
 * while preserving digits, commas, and parentheses in place and station names.
 */
export function sanitizeAqiData(data: AqiData, fallbackCity: string): AqiData {
  const cleanCity = sanitizeText(data.city, INPUT_LIMITS.MAX_CITY_LENGTH);
  return {
    city: cleanCity.length >= INPUT_LIMITS.MIN_CITY_LENGTH ? cleanCity : fallbackCity,
    country: sanitizeText(data.country, INPUT_LIMITS.MAX_CITY_LENGTH),
    aqi: data.aqi,
    pm25: data.pm25,
    category: data.category,
    ...sanitizeOptionalAqiNumbers(data),
    ...sanitizeOptionalAqiStrings(data),
  };
}
