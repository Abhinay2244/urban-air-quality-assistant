import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBanner } from '../../components/ErrorBanner.tsx';
import { UI_LABELS } from '../../constants/config.ts';
import { ErrorCode } from '../../types/index.ts';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBanner', () => {
  it('renders nothing when error is null', () => {
    const { container } = render(<ErrorBanner error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays error message and triggers retry and dismiss callbacks', () => {
    const onRetry = vi.fn();
    const onDismiss = vi.fn();

    render(
      <ErrorBanner
        error={{
          code: ErrorCode.NETWORK_ERROR,
          message: 'Unable to reach air quality service.',
          details: 'Check local network connectivity.',
        }}
        onRetry={onRetry}
        onDismiss={onDismiss}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Unable to reach air quality service.');
    expect(alert.textContent).toContain('Check local network connectivity.');

    fireEvent.click(screen.getByRole('button', { name: UI_LABELS.RETRY_LABEL }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: UI_LABELS.DISMISS_ERROR_LABEL }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
