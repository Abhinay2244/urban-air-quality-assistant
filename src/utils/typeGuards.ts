/**
 * @module utils/typeGuards
 * Responsibility: Provide reusable runtime type-narrowing predicates for unknown JSON payloads.
 * Must not throw errors, mutate objects, or import feature/service modules.
 */

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
