/**
 * @module utils/typeGuards
 * Responsibility: Provide reusable runtime type-narrowing predicates for unknown JSON payloads.
 * Must not throw errors, mutate objects, or import feature/service modules.
 */

import type { HourlyPm25Point } from '../types/index.ts';

/**
 * Type guard confirming an unknown value is a non-null plain record object.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard verifying an unknown value equals one of the provided string enum members.
 */
export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.some((item) => item === value);
}

/**
 * Type guard verifying a numeric value is finite and within [0, max].
 */
export function isBoundedFinite(val: unknown, max: number): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0 && val <= max;
}

/**
 * Type guard verifying an unknown value is an array of valid hourly PM2.5 points.
 */
export function isHourlyPm25Array(value: unknown): value is HourlyPm25Point[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.time === 'string' &&
        item.time.length > 0 &&
        isBoundedFinite(item.pm25, Number.MAX_SAFE_INTEGER),
    )
  );
}
