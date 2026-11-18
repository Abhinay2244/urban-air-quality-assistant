import { useCallback, useEffect, useState } from 'react';
import { INPUT_LIMITS } from '../constants/config.ts';

/**
 * Return value of the useCooldown custom hook.
 */
export interface UseCooldownResult {
  cooldownSeconds: number;
  startCooldown: () => void;
  resetCooldown: () => void;
}

/**
 * Manages a per-second countdown timer for rate-limiting submit actions.
 */
export function useCooldown(
  durationSeconds: number = INPUT_LIMITS.SUBMIT_COOLDOWN_SECONDS,
): UseCooldownResult {
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, INPUT_LIMITS.COOLDOWN_TICK_MS);
    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  const startCooldown = useCallback((): void => {
    setCooldownSeconds(durationSeconds);
  }, [durationSeconds]);

  const resetCooldown = useCallback((): void => {
    setCooldownSeconds(0);
  }, []);

  return { cooldownSeconds, startCooldown, resetCooldown };
}
