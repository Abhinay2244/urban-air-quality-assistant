import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../../components/ErrorBoundary.tsx';
import { APP_TEXT } from '@shared/constants/config.ts';

function HealthyChild(): ReactElement {
  return <p>Healthy workspace</p>;
}

function BrokenChild(): ReactElement {
  throw new Error('Simulated render crash');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders child content normally when no render error occurs', () => {
    render(
      <ErrorBoundary>
        <HealthyChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Healthy workspace')).toBeInTheDocument();
  });

  it('renders friendly fallback message and invokes reload handler when a descendant throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onReload = vi.fn();

    render(
      <ErrorBoundary onReload={onReload}>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(APP_TEXT.ERROR_BOUNDARY_TITLE)).toBeInTheDocument();
    expect(screen.getByText(APP_TEXT.ERROR_BOUNDARY_MESSAGE)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: APP_TEXT.ERROR_BOUNDARY_RELOAD_LABEL }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
