import type { ReactElement } from 'react';
import { UI_LABELS } from '../constants/config.ts';
import type { AppError } from '../types/index.ts';

/**
 * Props for ErrorBanner component.
 */
export interface ErrorBannerProps {
  error: AppError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * Displays a typed, user-friendly error message banner with optional retry and dismiss actions.
 */
export function ErrorBanner({ error, onRetry, onDismiss }: ErrorBannerProps): ReactElement | null {
  if (!error) {
    return null;
  }

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-950 shadow-xs dark:border-red-800/80 dark:bg-red-950/50 dark:text-red-100"
    >
      <div className="space-y-1">
        <p className="font-semibold">{error.message}</p>
        {error.details && <p className="text-sm text-red-800 dark:text-red-200">{error.details}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 transition-colors duration-150 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/60 dark:text-red-100 dark:hover:bg-red-900"
          >
            {UI_LABELS.RETRY_LABEL}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold text-red-900 underline underline-offset-4 hover:no-underline dark:text-red-200"
          >
            {UI_LABELS.DISMISS_ERROR_LABEL}
          </button>
        )}
      </div>
    </div>
  );
}
