import type { ReactElement } from 'react';
import { APP_TEXT, INPUT_LIMITS } from '../constants/config.ts';

/**
 * Props for ProgressBar component.
 */
export interface ProgressBarProps {
  value: number;
  label: string;
}

/**
 * Accessible native progress bar with a visible percentage text equivalent.
 */
export function ProgressBar({ value, label }: ProgressBarProps): ReactElement {
  const clamped = Math.min(
    INPUT_LIMITS.MAX_PM25_REDUCTION,
    Math.max(INPUT_LIMITS.MIN_PM25_REDUCTION, Math.round(value)),
  );
  const textValue = `${clamped}${APP_TEXT.REDUCTION_PERCENT_UNIT}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="font-semibold text-teal-800 tabular-nums dark:text-teal-300">
          {textValue}
        </span>
      </div>
      <progress
        value={clamped}
        max={INPUT_LIMITS.MAX_PM25_REDUCTION}
        aria-label={`${label}: ${textValue}`}
        className="h-3.5 w-full overflow-hidden rounded-full"
      >
        {textValue}
      </progress>
    </div>
  );
}
