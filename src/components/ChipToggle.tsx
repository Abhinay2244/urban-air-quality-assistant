import type { ReactElement, ReactNode } from 'react';

/**
 * Props for ChipToggle component.
 */
export interface ChipToggleProps {
  label: string;
  checked: boolean;
  icon: ReactNode;
  onToggle: (nextChecked: boolean) => void;
}

/**
 * Pill-style accessible toggle button for boolean household sensitivity options.
 */
export function ChipToggle({ label, checked, icon, onToggle }: ChipToggleProps): ReactElement {
  const activeStyle = checked
    ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-xs dark:border-teal-400 dark:bg-teal-950/60 dark:text-teal-100'
    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800';

  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onToggle(!checked)}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ${activeStyle}`}
    >
      <span
        className={
          checked ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'
        }
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
