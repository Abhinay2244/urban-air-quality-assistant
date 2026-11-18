import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCooldown } from '../../hooks/useCooldown.ts';

describe('useCooldown hook', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down once per second and stops at zero', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCooldown(3));

    expect(result.current.cooldownSeconds).toBe(0);

    act(() => {
      result.current.startCooldown();
    });
    expect(result.current.cooldownSeconds).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.cooldownSeconds).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.cooldownSeconds).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.cooldownSeconds).toBe(0);
  });

  it('resets cooldown immediately when resetCooldown is called', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useCooldown(5));

    act(() => {
      result.current.startCooldown();
    });
    expect(result.current.cooldownSeconds).toBe(5);

    act(() => {
      result.current.resetCooldown();
    });
    expect(result.current.cooldownSeconds).toBe(0);
  });
});
