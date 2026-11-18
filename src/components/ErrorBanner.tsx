import type { ReactElement } from 'react';
import { UI_LABELS } from '../constants/config.ts';
import type { AppError } from '../types/index.ts';

/**
 * Props for ErrorBanner component.
 */
export interface ErrorBannerProps {
  error: AppError | null;
  onDismiss?: () => void;
}

/**
 * Displays a typed, user-friendly error message banner.
 */
export function ErrorBanner({ error, onDismiss }: ErrorBannerProps): ReactElement | null {
  if (!error) {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <div>
        <p className="font-medium">{error.message}</p>
        {error.details && <p className="mt-1 text-xs text-red-700">{error.details}</p>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-medium underline hover:no-underline"
        >
          {UI_LABELS.DISMISS_ERROR_LABEL}
        </button>
      )}
    </div>
  );
}
