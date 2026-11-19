/**
 * @module utils/promptBuilder
 * Responsibility: Assemble sanitized, deterministic prompt strings from validated profile and AQI data.
 * Must not invoke the Gemini SDK, access environment secrets, or mutate input objects.
 */
import { INPUT_LIMITS } from '../constants/limits.ts';
import type { AqiData, UserProfile } from '../types/index.ts';
import { sanitizeText } from './sanitizing.ts';

/**
 * Builds the structured user prompt sent to Gemini after sanitizing all user-derived text.
 */
export function buildAssistantPrompt(profile: UserProfile, aqiData: AqiData): string {
  const safeCity = sanitizeText(aqiData.city, INPUT_LIMITS.MAX_CITY_LENGTH);
  const safeCountry = sanitizeText(aqiData.country, INPUT_LIMITS.MAX_CITY_LENGTH);

  return [
    'Generate a tailored winter smog action plan using this household profile and air quality reading:',
    `City: ${safeCity}, ${safeCountry}`,
    `Current US AQI: ${Math.round(aqiData.aqi)} (${aqiData.category})`,
    `Pollutants (ug/m3): PM2.5=${aqiData.pm25}, PM10=${aqiData.pm10}, NO2=${aqiData.no2}, O3=${aqiData.o3}`,
    `Family Type: ${profile.familyType}`,
    `Has Children: ${profile.hasChildren}`,
    `Has Elderly: ${profile.hasElderly}`,
    `Has Respiratory Condition: ${profile.hasRespiratoryCondition}`,
    `Primary Commute Mode: ${profile.commuteMode}`,
    `Home Type: ${profile.homeType}`,
  ].join('\n');
}
