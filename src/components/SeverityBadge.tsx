import type { ReactElement } from 'react';
import { AQI_VISUAL_TOKENS } from '../constants/uiTheme.ts';
import type { AqiCategoryInfo } from '@shared/types/index.ts';

/**
 * Props for SeverityBadge component.
 */
export interface SeverityBadgeProps {
  category: AqiCategoryInfo;
}

/**
 * Renders an AQI severity label styled with light and dark theme AA color tokens.
 */
export function SeverityBadge({ category }: Readonly<SeverityBadgeProps>): ReactElement {
  const tokens = AQI_VISUAL_TOKENS[category.id];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${tokens.badgeClass}`}
    >
      {category.label}
    </span>
  );
}
