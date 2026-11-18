import type { ReactElement } from 'react';
import { EmptyIllustration } from '../../components/EmptyIllustration.tsx';
import { SectionCard } from '../../components/SectionCard.tsx';
import { APP_TEXT, UI_LABELS } from '../../constants/config.ts';
import { SAMPLE_SCENARIOS } from '../../constants/samples.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import type { UserProfile } from '../../types/index.ts';

/**
 * Props for EmptyPlanState component.
 */
export interface EmptyPlanStateProps {
  onSelectSample: (sampleProfile: UserProfile) => void;
}

/**
 * Empty state with calm inline SVG illustration and clickable sample household scenarios.
 */
export function EmptyPlanState({ onSelectSample }: EmptyPlanStateProps): ReactElement {
  return (
    <SectionCard title={UI_LABELS.ASSISTANT_SECTION_TITLE}>
      <div className="space-y-5 py-2 text-center">
        <EmptyIllustration />
        <div className="mx-auto max-w-md space-y-2">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {UI_COPY.EMPTY_TITLE}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {APP_TEXT.EMPTY_PLAN_MESSAGE}
          </p>
        </div>

        <div className="space-y-2.5 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {UI_COPY.EMPTY_SAMPLE_PROMPT_LABEL}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SAMPLE_SCENARIOS.map((scenario) => (
              <button
                key={scenario.label}
                type="button"
                aria-label={`${UI_COPY.SAMPLE_A11Y_PREFIX} ${scenario.label}`}
                onClick={() => onSelectSample(scenario.profile)}
                className="inline-flex min-h-11 items-center rounded-full border border-teal-200 bg-teal-50/70 px-4 py-2 text-sm font-medium text-teal-900 transition-colors duration-150 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-200 dark:hover:bg-teal-900/70"
              >
                {scenario.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
