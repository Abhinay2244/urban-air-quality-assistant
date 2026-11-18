import type { ReactElement } from 'react';
import type { AQICategoryInfo } from '../types/index.ts';

/**
 * Props for StatusBadge component.
 */
export interface StatusBadgeProps {
  category: AQICategoryInfo;
}

/**
 * Renders an AQI severity label styled with its category color token.
 */
export function StatusBadge({ category }: StatusBadgeProps): ReactElement {
  return (
    <span
      className={`inline-block rounded border px-2.5 py-0.5 text-xs font-semibold ${category.badgeClass}`}
    >
      {category.label}
    </span>
  );
}
