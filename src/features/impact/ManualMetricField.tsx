import type { ReactElement } from 'react';

/**
 * Props for ManualMetricField component.
 */
export interface ManualMetricFieldProps {
  id: string;
  errorId: string;
  label: string;
  value: string;
  min: number;
  max: number;
  error: string | null;
  onChange: (value: string) => void;
}

/**
 * Numeric input field with accessible inline validation messaging for manual air quality overrides.
 */
export function ManualMetricField({
  id,
  errorId,
  label,
  value,
  min,
  max,
  error,
  onChange,
}: ManualMetricFieldProps): ReactElement {
  return (
    <div className="space-y-1.5 text-sm">
      <label htmlFor={id} className="block font-semibold text-slate-800 dark:text-slate-200">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
