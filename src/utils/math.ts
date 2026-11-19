/**
 * @module utils/math
 * Responsibility: Provide pure, finite-safe numeric rounding and clamping helpers.
 * Must not depend on domain constants, services, or browser APIs.
 */

/**
 * Rounds a finite numeric value and clamps it inclusively within [min, max].
 * Non-finite inputs safely default to min.
 */
export function clampRounded(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}
