import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProgressBar } from '../../components/ProgressBar.tsx';

afterEach(() => {
  cleanup();
});

describe('ProgressBar', () => {
  it('exposes percentage as visible text and as accessible progress attributes', () => {
    render(<ProgressBar value={64} label="Total Estimated PM2.5 Reduction" />);

    expect(screen.getByText('Total Estimated PM2.5 Reduction')).toBeTruthy();
    expect(screen.getAllByText('64%').length).toBeGreaterThanOrEqual(1);

    const progress = screen.getByRole('progressbar', {
      name: 'Total Estimated PM2.5 Reduction: 64%',
    }) as HTMLProgressElement;
    expect(progress.value).toBe(64);
    expect(progress.max).toBe(100);
  });

  it('clamps out-of-range values between 0 and 100', () => {
    render(<ProgressBar value={145} label="Reduction" />);
    const progress = screen.getByRole('progressbar', {
      name: 'Reduction: 100%',
    }) as HTMLProgressElement;
    expect(progress.value).toBe(100);
    expect(screen.getAllByText('100%').length).toBeGreaterThanOrEqual(1);
  });
});
