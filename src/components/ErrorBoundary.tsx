import { Component, type ReactElement, type ReactNode } from 'react';
import { APP_TEXT } from '@shared/constants/config.ts';

/** Props for ErrorBoundary component. */
export interface ErrorBoundaryProps {
  children: ReactNode;
  onReload?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level React error boundary showing a friendly fallback card and reload button on render failures.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false };

  /** Captures descendant rendering errors into fallback state. */
  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  private handleReload = (): void => {
    if (this.props.onReload) {
      this.props.onReload();
      return;
    }
    window.location.reload();
  };

  /** Renders children normally or an accessible recovery banner when an error occurred. */
  public override render(): ReactElement {
    if (!this.state.hasError) {
      return <>{this.props.children}</>;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <div
          role="alert"
          className="w-full max-w-md space-y-4 rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-950 shadow-sm dark:border-red-800/80 dark:bg-red-950/50 dark:text-red-100"
        >
          <h1 className="text-lg font-semibold">{APP_TEXT.ERROR_BOUNDARY_TITLE}</h1>
          <p className="text-sm text-red-800 dark:text-red-200">
            {APP_TEXT.ERROR_BOUNDARY_MESSAGE}
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex min-h-11 items-center rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 transition-colors duration-150 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/60 dark:text-red-100 dark:hover:bg-red-900"
          >
            {APP_TEXT.ERROR_BOUNDARY_RELOAD_LABEL}
          </button>
        </div>
      </div>
    );
  }
}
