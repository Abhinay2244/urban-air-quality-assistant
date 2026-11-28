import type { ReactElement } from 'react';
import { ProgressBar } from '../../components/ProgressBar.tsx';
import { SectionCard } from '../../components/SectionCard.tsx';
import { OUTDOOR_WINDOW_DURATION_HOURS } from '@shared/constants/aqi.ts';
import { APP_TEXT, UI_LABELS } from '@shared/constants/config.ts';
import { UI_COPY } from '../../constants/uiTheme.ts';
import type { AqiData, AssistantResponse } from '@shared/types/index.ts';
import { calculateTotalPM25Reduction, getAqiCategoryInfo } from '../../utils/aqiCalculations.ts';
import { buildDailyPlanSlots } from '@shared/utils/dailyPlan.ts';
import { findBestOutdoorWindow } from '@shared/utils/outdoorWindow.ts';
import { AqiHeroCard } from './AqiHeroCard.tsx';
import { ManualAqiForm } from './ManualAqiForm.tsx';
import { TodaysPlanCard } from './TodaysPlanCard.tsx';

/** Props for ImpactSummary feature component. */
export interface ImpactSummaryProps {
  aqiData: AqiData | null;
  response: AssistantResponse | null;
  isAqiUnavailable: boolean;
  isLoading: boolean;
  onEnableManualAqi: () => void;
  onSubmitManualAqi: (aqi: number, pm25?: number, pm10?: number) => void;
}

function deriveImpactSummaryData(
  aqiData: AqiData | null,
  response: AssistantResponse | null,
): {
  categoryInfo: ReturnType<typeof getAqiCategoryInfo> | null;
  combinedReduction: number;
  bestWindow: ReturnType<typeof findBestOutdoorWindow>;
  dailySlots: ReturnType<typeof buildDailyPlanSlots>;
} {
  const hourly = aqiData?.hourlyPm25 ?? [];
  return {
    categoryInfo: aqiData ? getAqiCategoryInfo(aqiData.category) : null,
    combinedReduction: response ? calculateTotalPM25Reduction(response.recommendations) : 0,
    bestWindow:
      hourly.length > 0 ? findBestOutdoorWindow(hourly, OUTDOOR_WINDOW_DURATION_HOURS) : null,
    dailySlots: hourly.length > 0 ? buildDailyPlanSlots(hourly) : [],
  };
}

/**
 * Displays air quality readings (via AqiHeroCard), manual override form, Today's plan,
 * and combined PM2.5 exposure reduction metric.
 */
export function ImpactSummary({
  aqiData,
  response,
  isAqiUnavailable,
  isLoading,
  onEnableManualAqi,
  onSubmitManualAqi,
}: Readonly<ImpactSummaryProps>): ReactElement | null {
  if (isLoading || (!aqiData && !isAqiUnavailable)) {
    return null;
  }

  const { categoryInfo, combinedReduction, bestWindow, dailySlots } = deriveImpactSummaryData(
    aqiData,
    response,
  );

  return (
    <SectionCard title={UI_LABELS.IMPACT_SECTION_TITLE}>
      <div className="space-y-5 text-sm">
        {isAqiUnavailable && (
          <ManualAqiForm isLoading={isLoading} onSubmitManualAqi={onSubmitManualAqi} />
        )}

        {aqiData && categoryInfo && (
          <>
            <AqiHeroCard
              aqiData={aqiData}
              categoryInfo={categoryInfo}
              isAqiUnavailable={isAqiUnavailable}
              onEnableManualAqi={onEnableManualAqi}
            />

            <TodaysPlanCard slots={dailySlots} bestWindow={bestWindow} />

            {response && (
              <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-5 dark:border-teal-800/70 dark:bg-teal-950/35">
                <p className="text-sm font-medium text-teal-900 dark:text-teal-200">
                  {UI_COPY.EXPOSURE_LEAD}{' '}
                  <span className="block text-3xl font-bold tracking-tight text-teal-950 tabular-nums dark:text-teal-100">
                    {combinedReduction}
                    {APP_TEXT.REDUCTION_PERCENT_UNIT}
                  </span>
                </p>
                <p className="mt-1 mb-4 text-sm text-slate-700 dark:text-slate-300">
                  {UI_COPY.EXPOSURE_SUBTEXT}
                </p>
                <ProgressBar value={combinedReduction} label={UI_LABELS.COMBINED_REDUCTION_LABEL} />
              </div>
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}
