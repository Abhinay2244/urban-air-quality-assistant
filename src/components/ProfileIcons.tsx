import type { ReactElement } from 'react';
import { CommuteMode, HomeType } from '../types/index.ts';

/**
 * Renders an inline SVG icon for each daily commute mode option.
 */
export function CommuteIcon({
  mode,
  className = 'h-4 w-4',
}: {
  mode: CommuteMode;
  className?: string;
}): ReactElement {
  if (mode === CommuteMode.CAR) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <path
          d="M5 12l1.8-4.5h10.4L19 12m-14 0v5h2m12-5v5h-2M7 17h10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (mode === CommuteMode.WALK_OR_BIKE) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <circle cx="6.5" cy="16.5" r="3" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="16.5" r="3" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M9.5 16.5L12 10h4l1.5 6.5M10 10h3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (mode === CommuteMode.REMOTE) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <rect x="4" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 19h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="5" y="4" width="14" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 11h14M8 20l1.5-3M16 20l-1.5-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Renders an inline SVG icon for each dwelling type option.
 */
export function HomeTypeIcon({
  homeType,
  className = 'h-4 w-4',
}: {
  homeType: HomeType;
  className?: string;
}): ReactElement {
  if (homeType === HomeType.APARTMENT) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <rect x="5" y="4" width="14" height="16" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M9 8h2M13 8h2M9 12h2M13 12h2M11 20v-4h2v4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (homeType === HomeType.SHARED_HOUSING) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="15.5" cy="9.5" r="2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M4.5 19a4.5 4.5 0 0 1 9 0M13.5 19a3.5 3.5 0 0 1 6 0"
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
        d="M4 11L12 4.5 20 11v8.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
