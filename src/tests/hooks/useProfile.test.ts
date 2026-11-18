import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useProfile } from '../../hooks/useProfile.ts';
import { CommuteMode } from '../../types/index.ts';

describe('useProfile hook', () => {
  it('updates fields and validates sanitized city values', () => {
    const { result } = renderHook(() => useProfile());

    act(() => {
      result.current.updateField('city', '  <b>Lahore</b>  ');
      result.current.updateField('commuteMode', CommuteMode.REMOTE);
    });

    let validated: ReturnType<typeof result.current.validateProfile> = null;
    act(() => {
      validated = result.current.validateProfile();
    });

    expect(validated).not.toBeNull();
    expect(result.current.profile.city).toBe('Lahore');
    expect(result.current.profile.commuteMode).toBe(CommuteMode.REMOTE);
    expect(result.current.validationError).toBeNull();
  });

  it('sets a validationError when city is invalid', () => {
    const { result } = renderHook(() => useProfile());

    act(() => {
      result.current.updateField('city', ' ');
    });

    act(() => {
      result.current.validateProfile();
    });

    expect(result.current.validationError).not.toBeNull();
  });
});
