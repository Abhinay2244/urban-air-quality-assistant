import type { ReactElement } from 'react';
import { APP_TEXT, UI_LABELS } from '@shared/constants/config.ts';
import { SECTION_THEMES } from '../../constants/uiTheme.ts';
import { type Recommendation, UrgencyLevel } from '@shared/types/index.ts';
import { formatUrgencyLabel } from '@shared/utils/formatting.ts';

/**
 * Props for RecommendationCard component.
 */
export interface RecommendationCardProps {
  item: Recommendation;
}

const URGENCY_BADGE_STYLES: Record<UrgencyLevel, string> = {
  [UrgencyLevel.CRITICAL]:
    'border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-950/80 dark:text-red-200',
  [UrgencyLevel.HIGH]:
    'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-200',
  [UrgencyLevel.STANDARD]:
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

/**
 * Displays a single recommendation card with urgency badge, action, and highlighted impact strip.
 */
export function RecommendationCard({ item }: Readonly<RecommendationCardProps>): ReactElement {
  const urgency = item.urgency ?? UrgencyLevel.STANDARD;
  const cardBorder = SECTION_THEMES[item.category].cardBorder;

  return (
    <li className={`rounded-2xl border bg-white p-4 shadow-2xs dark:bg-slate-900/90 ${cardBorder}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">{item.title}</h4>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold ${URGENCY_BADGE_STYLES[urgency]}`}
        >
          {formatUrgencyLabel(urgency)}
        </span>
      </div>

      <p className="mb-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {item.action}
      </p>

      <div className="rounded-xl border border-teal-200/80 bg-teal-50/70 px-3.5 py-2.5 text-sm dark:border-teal-800/60 dark:bg-teal-950/45">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-semibold text-teal-900 dark:text-teal-200">
            {UI_LABELS.IMPACT_EXPLANATION_LABEL}
          </span>
          <span className="font-semibold text-teal-800 tabular-nums dark:text-teal-300">
            -{item.estimatedPM25Reduction}
            {APP_TEXT.REDUCTION_PERCENT_UNIT} PM2.5
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{item.impactExplanation}</p>
      </div>
    </li>
  );
}
