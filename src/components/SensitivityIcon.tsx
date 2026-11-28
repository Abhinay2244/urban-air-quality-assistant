import type { ReactElement } from 'react';

type SensitivityKey = 'hasChildren' | 'hasElderly' | 'hasRespiratoryCondition';

/**
 * Props for SensitivityIcon component.
 */
export interface SensitivityIconProps {
  field: SensitivityKey;
  className?: string;
}

/**
 * Renders an inline SVG icon for household sensitivity toggle chips.
 */
export function SensitivityIcon({
  field,
  className = 'h-4 w-4',
}: Readonly<SensitivityIconProps>): ReactElement {
  if (field === 'hasChildren') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <circle cx="12" cy="7" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M7.5 19v-4a4.5 4.5 0 0 1 9 0v4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (field === 'hasElderly') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <circle cx="11" cy="6.5" r="2.8" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M7 20v-5.5a3.5 3.5 0 0 1 7 0V20M17 12v8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 4v7M9 10c-3 0-5 2.5-5 6 0 2 1.2 3.5 3 3.5 1.5 0 2.5-.8 3-2V10Zm6 0c3 0 5 2.5 5 6 0 2-1.2 3.5-3 3.5-1.5 0-2.5-.8-3-2V10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
