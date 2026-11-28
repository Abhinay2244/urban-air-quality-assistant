import type { ReactElement, RefObject } from 'react';
import { LoadingSkeleton } from '../../components/LoadingSkeleton.tsx';
import { SectionCard } from '../../components/SectionCard.tsx';
import { SectionCategoryIcon } from '../../components/SectionCategoryIcon.tsx';
import { APP_TEXT, UI_LABELS } from '@shared/constants/config.ts';
import { SECTION_THEMES } from '../../constants/uiTheme.ts';
import {
  type AqiData,
  type AssistantResponse,
  RecommendationCategory,
  type UserProfile,
} from '@shared/types/index.ts';
import { EmptyRecommendationsState } from './EmptyRecommendationsState.tsx';
import { RecommendationCard } from './RecommendationCard.tsx';
import { WhyThesePanel } from './WhyThesePanel.tsx';

/**
 * Props for RecommendationList feature component.
 */
export interface RecommendationListProps {
  response: AssistantResponse | null;
  profile: UserProfile;
  aqiData: AqiData | null;
  isLoading: boolean;
  resultsHeadingRef?: RefObject<HTMLHeadingElement | null>;
  onSelectSample: (sampleProfile: UserProfile) => void;
}

const SECTION_ORDER: readonly { category: RecommendationCategory; heading: string }[] = [
  { category: RecommendationCategory.HEALTH_ALERT, heading: UI_LABELS.SECTION_HEALTH_ALERTS },
  { category: RecommendationCategory.DAILY_ROUTINE, heading: UI_LABELS.SECTION_DAILY_ROUTINE },
  { category: RecommendationCategory.INDOOR_AIR, heading: UI_LABELS.SECTION_INDOOR_AIR },
  {
    category: RecommendationCategory.SUSTAINABLE_ALTERNATIVE,
    heading: UI_LABELS.SECTION_SUSTAINABLE,
  },
];

function RecommendationSectionBlock({
  section,
  items,
}: Readonly<{
  section: { category: RecommendationCategory; heading: string };
  items: AssistantResponse['recommendations'];
}>): ReactElement {
  const theme = SECTION_THEMES[section.category];
  const sectionBoxClass = items.length > 0 ? theme.containerClass : '';

  return (
    <div className={`space-y-3 ${sectionBoxClass}`}>
      <div className="flex items-center gap-2.5">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${theme.iconBg}`}
        >
          <SectionCategoryIcon category={section.category} />
        </span>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {section.heading}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {APP_TEXT.EMPTY_CATEGORY_MESSAGE}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <RecommendationCard key={`${item.title}-${index}`} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Renders loading skeleton, empty illustration state, or the four themed recommendation sections.
 */
export function RecommendationList({
  response,
  profile,
  aqiData,
  isLoading,
  resultsHeadingRef,
  onSelectSample,
}: Readonly<RecommendationListProps>): ReactElement {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!response) {
    return <EmptyRecommendationsState onSelectSample={onSelectSample} />;
  }

  return (
    <SectionCard
      title={UI_LABELS.ASSISTANT_SECTION_TITLE}
      {...(resultsHeadingRef !== undefined ? { headingRef: resultsHeadingRef } : {})}
      headingTabIndex={-1}
    >
      <div className="space-y-6">
        {response.isFallback && (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/80 dark:bg-amber-950/50 dark:text-amber-100">
            {APP_TEXT.FALLBACK_NOTICE}
          </p>
        )}

        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {response.summary}
        </p>

        <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4 text-sm dark:border-teal-800/70 dark:bg-teal-950/40">
          <span className="font-semibold text-teal-950 dark:text-teal-200">
            {UI_LABELS.PRIORITY_LABEL}:{' '}
          </span>
          <span className="text-slate-800 dark:text-slate-200">{response.priorityGuidance}</span>
        </div>

        <WhyThesePanel profile={profile} aqiData={aqiData} />

        <div className="space-y-6">
          {SECTION_ORDER.map((section) => (
            <RecommendationSectionBlock
              key={section.category}
              section={section}
              items={response.recommendations.filter((rec) => rec.category === section.category)}
            />
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
