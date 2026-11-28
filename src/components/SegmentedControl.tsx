import type { ReactElement, ReactNode } from 'react';

/**
 * Individual choice descriptor for SegmentedControl.
 */
interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/**
 * Props for SegmentedControl component.
 */
export interface SegmentedControlProps<T extends string> {
  legend: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (nextValue: T) => void;
}

/**
 * Accessible segmented button group with optional inline icons for lifestyle choices.
 */
export function SegmentedControl<T extends string>({
  legend,
  value,
  options,
  onChange,
}: Readonly<SegmentedControlProps<T>>): ReactElement {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-slate-800 dark:text-slate-200">{legend}</legend>
      <div
        role="group"
        aria-label={legend}
        className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-100/80 p-1.5 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-950/60"
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          const stateStyle = isSelected
            ? 'bg-white text-teal-900 shadow-xs ring-1 ring-teal-600/30 dark:bg-slate-800 dark:text-teal-200 dark:ring-teal-400/40'
            : 'text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-900/70';

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                onChange(option.value);
              }}
              className={`flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-150 ${stateStyle}`}
            >
              {option.icon && (
                <span
                  className={
                    isSelected
                      ? 'shrink-0 text-teal-700 dark:text-teal-300'
                      : 'shrink-0 text-slate-500 dark:text-slate-400'
                  }
                >
                  {option.icon}
                </span>
              )}
              <span className="leading-snug">{option.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
