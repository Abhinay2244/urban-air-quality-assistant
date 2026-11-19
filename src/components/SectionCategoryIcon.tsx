import type { ReactElement } from 'react';
import { RecommendationCategory } from '../types/index.ts';

/**
 * Props for SectionCategoryIcon component.
 */
export interface SectionCategoryIconProps {
  category: RecommendationCategory;
  className?: string;
}

/**
 * Renders the inline SVG icon for a recommendation section heading.
 */
export function SectionCategoryIcon({
  category,
  className = 'h-5 w-5',
}: SectionCategoryIconProps): ReactElement {
  if (category === RecommendationCategory.HEALTH_ALERT) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <path
          d="M12 3L4 6.5V12c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6.5L12 3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M12 8.5V13M12 16.2h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (category === RecommendationCategory.DAILY_ROUTINE) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 7v5l3.5 2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (category === RecommendationCategory.INDOOR_AIR) {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
        <path
          d="M3 10.5L12 3.5l9 7V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8 14h6a2 2 0 1 0-2-2"
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
        d="M5 19C5 11.5 11.5 5 19 5c0 7.5-6.5 14-14 14Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M5 19l7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
