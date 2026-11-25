/**
 * @module constants/prompts
 * Responsibility: Define Gemini system instructions, JSON schema field descriptions, and safe fallback guidance.
 * Must not call the Gemini SDK, parse runtime responses, or read environment variables.
 */
import type { AssistantResponse, RecommendationCategory } from '../types/index.ts';

/**
 * System instruction guiding Gemini to provide evidence-based winter smog advice.
 */
export const ASSISTANT_SYSTEM_INSTRUCTION = `
You are an Urban Air Quality Assistant supporting households in smog-prone Indian cities.
Provide practical, low-cost, low-emission routines, indoor air quality hacks, sustainable alternatives, and targeted health alerts tailored to the household profile and provided AQI (US scale, as reported by WAQI and Open-Meteo).
Follow these strict rules:
1. Live data integrity: AQI (US scale), PM2.5, PM10 (when provided), and hourly forecast slots are authoritative provided data. Never invent, guess, extrapolate, or alter AQI, PM2.5, or PM10 numbers. If PM10 is omitted or not provided, do not fabricate a PM10 figure.
2. Cover all four categories: DAILY_ROUTINE, INDOOR_AIR, SUSTAINABLE_ALTERNATIVE, and HEALTH_ALERT, with at most 3 recommendations per section (4 to 8 recommendations total).
3. Persona specificity:
   - Parents / children: safe outdoor play windows, school-drop precautions, and indoor play swaps.
   - Older adults: senior cardiovascular/respiratory pacing and warm indoor clean air.
   - Working professionals: fitted N95/KF94 vs surgical masks, enclosed metro/bus vs open two-wheeler exposure, and shifting commute timing.
   - Students: college/school commute timing, scheduling outdoor sports or PT practice in lower-PM2.5 slots, and moving vigorous exercise indoors during high PM2.5.
4. Practical Indian-home indoor guidance: natural cross-ventilation strictly during cleaner afternoon dips, wet mopping over dry sweeping, room-sized HEPA CADR with closed doors, houseplants strictly as minor aid only (never a fix), and a low-cost DIY clean-air option (box-fan + MERV-13/HEPA filter or wet-towel/weatherstrip draft seals).
5. Reference any provided "Today's plan" morning/afternoon/evening forecast slots and best 24h outdoor window directly in DAILY_ROUTINE commute and activity advice.
6. Keep output concise: limit each title to about 8 words, each action to about 25 words, and each impactExplanation to exactly one sentence (plain text only) tied to the user's provided AQI and profile, with estimatedPM25Reduction (0 to 100).
7. Return strictly valid JSON matching the requested schema.
`.trim();

/**
 * Field descriptions shared with the server-side Gemini JSON response schema.
 */
export const ASSISTANT_SCHEMA_DESCRIPTIONS = {
  ROOT: 'Tailored urban air quality action plan for a household.',
  SUMMARY: 'Concise 2-sentence overview of the current air risk and household strategy.',
  PRIORITY_GUIDANCE: 'Single highest-priority protective step for today.',
  RECOMMENDATIONS:
    'List of 4 to 8 personalized recommendations across all four categories, with at most 3 recommendations per section.',
  TITLE: 'Short actionable headline of about 8 words or fewer.',
  CATEGORY: 'One of DAILY_ROUTINE, INDOOR_AIR, SUSTAINABLE_ALTERNATIVE, or HEALTH_ALERT.',
  ACTION:
    'Specific, step-by-step action tailored to Indian home conditions, commute, and family in about 25 words or fewer.',
  IMPACT_EXPLANATION:
    'Exactly one clear sentence tying the PM2.5/PM10 exposure reduction directly to the provided US-scale AQI and household profile.',
  ESTIMATED_PM25_REDUCTION:
    'Estimated percentage reduction in personal PM2.5 exposure or emissions (0-100).',
} as const;

/**
 * Safe validated fallback returned if model JSON output cannot be parsed.
 */
export const SAFE_FALLBACK_ASSISTANT_RESPONSE: AssistantResponse = {
  summary:
    'Elevated urban particulate levels require shifting outdoor trips to cleaner midday hours, wet-mopping indoor dust, and filtering primary rooms.',
  priorityGuidance:
    'Keep windows closed during morning and evening smog peaks and run room-sized filtration in main sleeping areas.',
  recommendations: [
    {
      title: 'Protect Sensitive Breathing Zones',
      category: 'HEALTH_ALERT' as RecommendationCategory,
      action:
        'Limit outdoor exertion during smog peaks, monitor breathing symptoms, and wear fitted N95/KF94 masks on essential commutes.',
      impactExplanation:
        'At elevated US-scale AQI levels, N95 filtration and reduced peak exertion cut acute PM2.5 inhalation for sensitive household members.',
      estimatedPM25Reduction: 55,
    },
    {
      title: 'Wet Mop and Create a Sealed Clean-Air Room',
      category: 'INDOOR_AIR' as RecommendationCategory,
      action:
        'Wet-mop floors instead of dry sweeping, seal door gaps with weatherstripping, and run a room-sized HEPA purifier or DIY box-fan MERV-13 unit (indoor plants help only marginally).',
      impactExplanation:
        'Suppressing settled PM10 dust and isolating one closed bedroom sharply reduces indoor particulate levels for your home type.',
      estimatedPM25Reduction: 45,
    },
    {
      title: 'Shift Outdoor Trips to Midday Dispersion Hours',
      category: 'DAILY_ROUTINE' as RecommendationCategory,
      action:
        'Schedule school runs, errands, outdoor practice, and enclosed metro/transit commutes during late morning to mid-afternoon rather than early smog peaks.',
      impactExplanation:
        'Avoiding morning and evening inversion layers cuts roadside PM2.5 inhalation during your daily commute.',
      estimatedPM25Reduction: 35,
    },
    {
      title: 'Replace Solid-Fuel and Idle-Heavy Habits',
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
