import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx';
import { APP_TEXT } from '@shared/constants/config.ts';
import { INPUT_LIMITS } from '@shared/constants/limits.ts';

describe('LoadingSkeleton', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('reveals the slow-loading note after the configured 5-second delay', () => {
    vi.useFakeTimers();
    render(<LoadingSkeleton />);

    expect(screen.queryByText(APP_TEXT.SLOW_LOADING_NOTE)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(INPUT_LIMITS.SLOW_LOADING_NOTE_DELAY_MS - 100);
    });
    expect(screen.queryByText(APP_TEXT.SLOW_LOADING_NOTE)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText(APP_TEXT.SLOW_LOADING_NOTE)).toBeInTheDocument();
  });
});
