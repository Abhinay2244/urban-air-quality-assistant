import type { Express } from 'express';
import { vi } from 'vitest';
import { API_ENDPOINTS } from '../../constants/http.ts';
import { AqiCategoryId, type AqiData, type UserProfile } from '../../types/index.ts';

/** Builds a @google/genai mock module wrapping a provided generateContent spy. */
export async function mockGenAiModule(generateContent: unknown): Promise<Record<string, unknown>> {
  const actual = await vi.importActual<typeof import('@google/genai')>('@google/genai');
  return {
    ...actual,
    GoogleGenAI: class {
      models = { generateContent };
    },
  };
}

/** Sample AQI payload shared across server Gemini tests. */
export const SAMPLE_SERVER_AQI: AqiData = {
  city: 'Delhi',
  country: 'India',
  aqi: 184,
  pm25: 105,
  category: AqiCategoryId.UNHEALTHY,
};

/** Valid serialized recommendation payload shared across server Gemini tests. */
export const VALID_GEMINI_PLAN_JSON = JSON.stringify({
  summary: 'High particulate alert.',
  priorityGuidance: 'Stay indoors.',
  recommendations: [
    {
      title: 'Run HEPA Purifier',
      category: 'INDOOR_AIR',
      action: 'Close windows and run filtration in bedrooms.',
      impactExplanation: 'Reduces indoor PM2.5.',
      estimatedPM25Reduction: 40,
    },
  ],
});

/** Posts a recommendation request to an ephemeral test server. */
export async function postRecommendationJson(
  baseUrl: string,
  profile: UserProfile,
  aqiData: AqiData,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${baseUrl}${API_ENDPOINTS.ASSISTANT_RECOMMENDATIONS}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, aqiData }),
  });
  return { status: res.status, body: (await res.json()) as unknown };
}

/** Starts an ephemeral HTTP server for an Express instance and closes it after running assertions. */
export async function withEphemeralServer(
  createOrSetup: () => Promise<Express> | Express,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = await createOrSetup();
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected TCP server address');
    }
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
  }
}
