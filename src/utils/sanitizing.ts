import { INPUT_LIMITS } from '../constants/limits.ts';

const SCRIPT_BLOCK_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const STYLE_BLOCK_PATTERN = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
const HTML_TAG_PATTERN = /<[^>]*>/g;
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
  input: string,
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
