import type { ReactElement } from 'react';

/**
 * Props shared by inline SVG icon components.
 */
export interface IconProps {
  className?: string;
}

/**
 * Brand logo mark combining clean breeze lines and a calm teal container.
 */
export function LogoMarkIcon({ className = 'h-7 w-7' }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="9" className="fill-teal-700 dark:fill-teal-500" />
      <path
        d="M8 14.5C11.5 14.5 13 11 16.5 11C19.5 11 21 13 21 14.5C21 16 19.5 17.5 17.5 17.5H9"
        stroke="white"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M8 21.5H19.5C22 21.5 24 19.8 24 17.7C24 15.8 22.5 14.5 21 14.5"
        stroke="white"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Sun icon for light theme switch.
 */
export function SunIcon({ className = 'h-5 w-5' }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M12 2.5V5M12 19V21.5M4.9 4.9L6.7 6.7M17.3 17.3L19.1 19.1M2.5 12H5M19 12H21.5M4.9 19.1L6.7 17.3M17.3 6.7L19.1 4.9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Moon icon for dark theme switch.
 */
export function MoonIcon({ className = 'h-5 w-5' }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M20.2 14.6A8.5 8.5 0 0 1 9.4 3.8a8.5 8.5 0 1 0 10.8 10.8Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Inline loading spinner shown inside primary submit buttons.
 */
export function SpinnerIcon({ className = 'h-5 w-5 animate-spin' }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Location pin icon for city section headers.
 */
export function LocationIcon({ className = 'h-5 w-5' }: IconProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0c0 5.4 6.5 11 6.5 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
