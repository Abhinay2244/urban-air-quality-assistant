/**
 * @module utils/promptBuilder
 * Responsibility: Assemble sanitized, deterministic prompt strings from validated profile and AQI data.
 * Must not invoke the Gemini SDK, access environment secrets, or mutate input objects.
 */
import { OUTDOOR_WINDOW_DURATION_HOURS } from '../constants/aqi.ts';
import { INPUT_LIMITS } from '../constants/limits.ts';
import { type AqiData, FamilyType, type UserProfile } from '../types/index.ts';
import { buildDailyPlanSlots } from './dailyPlan.ts';
import { formatClockTime } from './formatting.ts';
import { findBestOutdoorWindow } from './outdoorWindow.ts';
import { sanitizeText } from './sanitizing.ts';

function buildPersonaFocus(profile: UserProfile): string {
  const cues: string[] = [];
  if (profile.hasChildren) {
    cues.push('Parents: plan safe outdoor play windows and school-commute timing for children.');
  }
  if (profile.hasElderly) {
    cues.push('Seniors: include pacing, warm indoor air, and respiratory precautions for elders.');
  }
  if (profile.familyType === FamilyType.WORKING_PROFESSIONAL) {
    cues.push(
      'Working professional: detail mask type (N95/KF94), enclosed metro/bus vs open two-wheeler exposure, and office commute timing.',
    );
  }
  if (profile.familyType === FamilyType.STUDENT) {
    cues.push(
      'Student: align college/school commute and outdoor sports or PT practice with cleaner forecast slots, moving vigorous workouts indoors when elevated.',
    );
  }
  return cues.length > 0 ? `Persona Focus: ${cues.join(' ')}` : '';
}

function buildSourceNote(aqiData: AqiData): string {
  if (aqiData.source === 'manual') return 'manual entry';
  if (aqiData.provider === 'waqi') return 'live WAQI';
  if (aqiData.provider === 'open-meteo') return 'live Open-Meteo';
  return 'provided live data';
}

function formatSlotSummary(slot: {
  label: string;
  timeRange: string;
  averagePm25: number;
  action: string;
}): string {
  return `${slot.label} (${slot.timeRange}): ${slot.averagePm25} ug/m3 [${slot.action}]`;
}

/**
 * Builds the structured user prompt sent to Gemini after sanitizing all user-derived text.
 */
export function buildAssistantPrompt(profile: UserProfile, aqiData: AqiData): string {
  const safeCity = sanitizeText(aqiData.city, INPUT_LIMITS.MAX_CITY_LENGTH);
  const safeCountry = sanitizeText(aqiData.country, INPUT_LIMITS.MAX_CITY_LENGTH);
  const pm10Segment = aqiData.pm10 !== undefined ? `PM10=${aqiData.pm10}` : 'PM10=not provided';
  const slots = aqiData.hourlyPm25 ? buildDailyPlanSlots(aqiData.hourlyPm25) : [];
  const bestWindow = aqiData.hourlyPm25
    ? findBestOutdoorWindow(aqiData.hourlyPm25, OUTDOOR_WINDOW_DURATION_HOURS)
    : null;

  const slotLine =
    slots.length > 0
      ? `Today's Hourly Plan Slots (ug/m3 PM2.5): ${slots.map(formatSlotSummary).join('; ')} — refer to these slots for commute and activity timing.`
      : '';
  const windowLine = bestWindow
    ? `Best 24h Outdoor Window: ${formatClockTime(bestWindow.startTime)} to ${formatClockTime(bestWindow.endTime)} (avg PM2.5 ${bestWindow.averagePm25} ug/m3) — reference this window in DAILY_ROUTINE.`
    : '';
  const personaLine = buildPersonaFocus(profile);

  return [
    'Use the authoritative provided US-scale AQI and pollutant values below without altering or inventing metrics:',
    `City: ${safeCity}, ${safeCountry} (Source: ${buildSourceNote(aqiData)})`,
    `Provided AQI (US scale, as reported by WAQI and Open-Meteo): ${Math.round(aqiData.aqi)} (${aqiData.category})`,
    `Provided Pollutants (ug/m3): PM2.5=${aqiData.pm25}, ${pm10Segment}, NO2=${aqiData.no2 ?? 0}, O3=${aqiData.o3 ?? 0}`,
    `Family Type: ${profile.familyType}`,
    `Has Children: ${profile.hasChildren}`,
    `Has Elderly: ${profile.hasElderly}`,
    `Has Respiratory Condition: ${profile.hasRespiratoryCondition}`,
    `Primary Commute Mode: ${profile.commuteMode}`,
    `Home Type: ${profile.homeType}`,
    slotLine,
    windowLine,
    personaLine,
  ]
    .filter((line) => line.length > 0)
    .join('\n');
}
