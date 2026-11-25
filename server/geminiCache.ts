/**
 * @module server/geminiCache
 * Responsibility: Provide a bounded, TTL-expiring, FIFO-evicting in-memory cache for validated Gemini plans.
 * Must not cache errors or fallback responses, call external APIs, or access Express req/res objects.
 */
import { INPUT_LIMITS } from '../src/constants/limits.ts';
import { GEMINI_CACHE_CONFIG } from '../src/constants/server.ts';
import type { AqiData, UserProfile } from '../src/types/index.ts';
import { sanitizeText } from '../src/utils/sanitizing.ts';

interface CacheEntry {
  rawText: string;
  expiresAt: number;
}

/**
 * Bounded in-memory recommendation cache contract.
 */
export interface RecommendationsCache {
  get: (key: string, nowMs?: number) => string | null;
  set: (key: string, rawText: string, nowMs?: number) => void;
  size: () => number;
}

/**
 * Builds a deterministic cache key from sanitized profile fields, AQI rounded to nearest 10,
 * and current UTC date + hour so different cities, personas, or sensitivities never collide.
 */
export function buildRecommendationsCacheKey(
  profile: UserProfile,
  aqiData: AqiData,
  now: Date = new Date(),
): string {
  const safeProfileCity = sanitizeText(profile.city, INPUT_LIMITS.MAX_CITY_LENGTH).toLowerCase();
  const safeAqiCity = sanitizeText(aqiData.city, INPUT_LIMITS.MAX_CITY_LENGTH).toLowerCase();
  const roundedAqi =
    Math.round(aqiData.aqi / GEMINI_CACHE_CONFIG.AQI_BUCKET_SIZE) *
    GEMINI_CACHE_CONFIG.AQI_BUCKET_SIZE;
  const dateHourKey = now.toISOString().slice(0, 13);

  return JSON.stringify([
    safeProfileCity,
    safeAqiCity,
    profile.familyType,
    profile.hasChildren,
    profile.hasElderly,
    profile.hasRespiratoryCondition,
    profile.commuteMode,
    profile.homeType,
    roundedAqi,
    dateHourKey,
  ]);
}

function pruneExpired(entries: Map<string, CacheEntry>, nowMs: number): void {
  for (const [key, entry] of entries.entries()) {
    if (nowMs >= entry.expiresAt) {
      entries.delete(key);
    }
  }
}

/**
 * Creates a bounded FIFO cache with TTL expiration, evicting oldest entries first when full.
 */
export function createRecommendationsCache(
  ttlMs: number = GEMINI_CACHE_CONFIG.TTL_MS,
  maxEntries: number = GEMINI_CACHE_CONFIG.MAX_ENTRIES,
): RecommendationsCache {
  const entries = new Map<string, CacheEntry>();

  return {
    get(key: string, nowMs: number = Date.now()): string | null {
      const entry = entries.get(key);
      if (!entry) return null;
      if (nowMs >= entry.expiresAt) {
        entries.delete(key);
        return null;
      }
      return entry.rawText;
    },
    set(key: string, rawText: string, nowMs: number = Date.now()): void {
      if (maxEntries <= 0 || ttlMs <= 0) return;
      if (entries.has(key)) {
        entries.delete(key);
      } else if (entries.size >= maxEntries) {
        pruneExpired(entries, nowMs);
        while (entries.size >= maxEntries) {
          const oldestKey = entries.keys().next().value;
          if (oldestKey === undefined) break;
          entries.delete(oldestKey);
        }
      }
      entries.set(key, { rawText, expiresAt: nowMs + ttlMs });
    },
    size(): number {
      return entries.size;
    },
  };
}
