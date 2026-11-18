import type {
  AQIData,
  AssistantResponse,
  RecommendationCategory,
  UserProfile,
} from '../types/index.ts';

/**
 * System instruction guiding Gemini to provide evidence-based winter smog advice.
 */
export const ASSISTANT_SYSTEM_INSTRUCTION = `
You are an Urban Air Quality Assistant supporting families and communities during severe winter smog and urban air pollution episodes.
Your goal is to provide practical, low-cost, low-emission daily routines, indoor air quality hacks, and sustainable alternatives tailored to the household profile and current AQI conditions.
For every recommendation:
1. Keep actions concrete, realistic, and safe for the household's vulnerable members (children, elderly, respiratory conditions).
2. Explain the direct health or emission impact clearly in plain language.
3. Estimate the realistic percentage reduction in personal PM2.5 exposure or household emissions (0 to 100).
4. Return strictly valid JSON matching the requested schema with 3 to 5 prioritized recommendations.
`.trim();

/**
 * Field descriptions shared with the server-side Gemini JSON response schema.
 */
export const ASSISTANT_SCHEMA_DESCRIPTIONS = {
  ROOT: 'Tailored urban air quality action plan for a household.',
  SUMMARY: 'Concise 2-sentence overview of the current air risk and household strategy.',
  PRIORITY_GUIDANCE: 'Single highest-priority protective step for today.',
  RECOMMENDATIONS: 'List of 3 to 5 personalized, actionable recommendations.',
  TITLE: 'Short actionable headline.',
  CATEGORY: 'One of DAILY_ROUTINE, INDOOR_AIR, SUSTAINABLE_ALTERNATIVE, or COMMUNITY_ACTION.',
  ACTION: 'Specific, step-by-step action tailored to the home, commute, and family.',
  IMPACT_EXPLANATION: 'Direct explanation of how this reduces PM2.5 exposure or urban emissions.',
  ESTIMATED_PM25_REDUCTION:
    'Estimated percentage reduction in personal PM2.5 exposure or emissions (0-100).',
} as const;

/**
 * Builds the structured user prompt sent to Gemini from sanitized profile and AQI data.
 */
export function buildAssistantPrompt(profile: UserProfile, aqiData: AQIData): string {
  return [
    'Generate a tailored winter smog action plan using this household profile and live air quality reading:',
    `City: ${aqiData.city}, ${aqiData.country}`,
    `Current US AQI: ${aqiData.aqi} (${aqiData.category})`,
    `Pollutants (ug/m3): PM2.5=${aqiData.pm25}, PM10=${aqiData.pm10}, NO2=${aqiData.no2}, O3=${aqiData.o3}`,
    `Family Type: ${profile.familyType}`,
    `Has Children: ${profile.hasChildren}`,
    `Has Elderly: ${profile.hasElderly}`,
    `Has Respiratory Condition: ${profile.hasRespiratoryCondition}`,
    `Primary Commute Mode: ${profile.commuteMode}`,
    `Home Type: ${profile.homeType}`,
  ].join('\n');
}

/**
 * Safe validated fallback returned if model JSON output cannot be parsed.
 */
export const SAFE_FALLBACK_ASSISTANT_RESPONSE: AssistantResponse = {
  summary:
    'Elevated urban particulate levels require reducing outdoor peak-hour exposure and keeping indoor living spaces sealed and filtered.',
  priorityGuidance:
    'Keep windows closed during morning and evening inversion hours and run indoor filtration in main living areas.',
  recommendations: [
    {
      title: 'Create a Clean-Air Living Room Zone',
      category: 'INDOOR_AIR' as RecommendationCategory,
      action:
        'Seal window and door gaps with weatherstripping and run a HEPA purifier or DIY box-fan MERV-13 filter continuously.',
      impactExplanation:
        'Minimizes fine particulate infiltration and lowers indoor PM2.5 concentrations where the family spends most hours.',
      estimatedPM25Reduction: 45,
    },
    {
      title: 'Shift Essential Trips Away from Rush-Hour Peaks',
      category: 'DAILY_ROUTINE' as RecommendationCategory,
      action:
        'Schedule school runs, errands, and transit trips between late morning and mid-afternoon when dispersion improves, wearing N95 masks outdoors.',
      impactExplanation:
        'Avoids morning and evening temperature-inversion smog spikes and cuts inhaled roadside particulate matter.',
      estimatedPM25Reduction: 35,
    },
    {
      title: 'Replace Solid-Fuel or Idle-Heavy Habits',
      category: 'SUSTAINABLE_ALTERNATIVE' as RecommendationCategory,
      action:
        'Avoid burning wood, candles, or incense indoors, and combine errands into shared transit or carpool trips.',
      impactExplanation:
        'Eliminates indoor combustion smoke and reduces neighborhood tailpipe PM2.5 and NO2 emissions.',
      estimatedPM25Reduction: 25,
    },
  ],
  isFallback: true,
};
