import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useProfile } from '../../hooks/useProfile.ts';
import { CommuteMode } from '@shared/types/index.ts';

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
    expect(result.current.fieldErrors.city).toBeUndefined();
  });

  it('sets live inline fieldError immediately when city becomes invalid', () => {
    const { result } = renderHook(() => useProfile());

    act(() => {
      result.current.updateField('city', ' ');
    });

    expect(result.current.fieldErrors.city).toBeDefined();

    act(() => {
      result.current.updateField('city', 'Beijing');
    });

    expect(result.current.fieldErrors.city).toBeUndefined();
  });

  it('replaces whole profile atomically and clears validationError', () => {
    const { result } = renderHook(() => useProfile());

    act(() => {
      result.current.updateField('city', 'A');
    });
    act(() => {
      result.current.validateProfile();
    });
    expect(result.current.validationError).not.toBeNull();

    act(() => {
      result.current.clearValidationError();
    });
    expect(result.current.validationError).toBeNull();

    act(() => {
      result.current.replaceProfile({
        ...result.current.profile,
        city: '  Beijing  ',
        commuteMode: CommuteMode.WALK_OR_BIKE,
      });
    });
    expect(result.current.profile.city).toBe('Beijing');
    expect(result.current.profile.commuteMode).toBe(CommuteMode.WALK_OR_BIKE);
    expect(result.current.fieldErrors.city).toBeUndefined();
  });
});
