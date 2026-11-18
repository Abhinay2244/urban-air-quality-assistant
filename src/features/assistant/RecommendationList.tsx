import type { ReactElement } from 'react';
import { SectionCard } from '../../components/SectionCard.tsx';
import { APP_TEXT, UI_LABELS } from '../../constants/config.ts';
import type { AssistantResponse } from '../../types/index.ts';
import { formatCategoryLabel } from '../../utils/formatting.ts';

/**
 * Props for RecommendationList feature component.
 */
export interface RecommendationListProps {
  response: AssistantResponse | null;
}

/**
 * Renders the GenAI air quality action plan and direct impact explanation per item.
 */
export function RecommendationList({ response }: RecommendationListProps): ReactElement {
  if (!response) {
    return (
      <SectionCard title={UI_LABELS.ASSISTANT_SECTION_TITLE}>
        <p className="text-sm text-slate-600">{APP_TEXT.EMPTY_PLAN_MESSAGE}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={UI_LABELS.ASSISTANT_SECTION_TITLE}>
      <div className="space-y-4">
        {response.isFallback && (
          <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {APP_TEXT.FALLBACK_NOTICE}
          </p>
        )}

        <p className="text-sm text-slate-800">{response.summary}</p>

        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <span className="font-semibold text-slate-900">{UI_LABELS.PRIORITY_LABEL}: </span>
          <span className="text-slate-700">{response.priorityGuidance}</span>
        </div>

        <ul className="space-y-3">
          {response.recommendations.map((item, index) => (
            <li key={`${item.title}-${index}`} className="rounded border border-slate-200 p-4">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <span className="text-xs font-medium text-slate-600">
                  {formatCategoryLabel(item.category)}
                </span>
              </div>
              <p className="mb-2 text-sm text-slate-700">{item.action}</p>
              <p className="text-xs text-slate-600">
                <span className="font-semibold">{UI_LABELS.IMPACT_EXPLANATION_LABEL}: </span>
                {item.impactExplanation}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-800">
                {UI_LABELS.PM25_REDUCTION_LABEL}: {item.estimatedPM25Reduction}
                {APP_TEXT.REDUCTION_PERCENT_UNIT}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </SectionCard>
  );
}
