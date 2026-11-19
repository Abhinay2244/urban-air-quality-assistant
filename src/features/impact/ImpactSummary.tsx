import type { ReactElement } from 'react';
import { AqiGauge } from '../../components/AqiGauge.tsx';
import { ProgressBar } from '../../components/ProgressBar.tsx';
import { SectionCard } from '../../components/SectionCard.tsx';
import { SeverityBadge } from '../../components/SeverityBadge.tsx';
import { WHO_PM25_GUIDELINE_UG_M3 } from '../../constants/aqi.ts';
import { APP_TEXT, UI_LABELS } from '../../constants/config.ts';
import { AQI_VISUAL_TOKENS, UI_COPY } from '../../constants/uiTheme.ts';
import type { AqiData, AssistantResponse } from '../../types/index.ts';
import { calculateTotalPM25Reduction, getAqiCategoryInfo } from '../../utils/aqiCalculations.ts';
import { formatPM25Value, formatTimestamp } from '../../utils/formatting.ts';
import { ManualAqiForm } from './ManualAqiForm.tsx';

/**
 * Props for ImpactSummary feature component.
 */
export interface ImpactSummaryProps {
  aqiData: AqiData | null;
  response: AssistantResponse | null;
  isAqiUnavailable: boolean;
  isLoading: boolean;
  onEnableManualAqi: () => void;
  onSubmitManualAqi: (aqi: number, pm25?: number) => void;
}

/**
 * Displays the AQI circular gauge hero card, WHO PM2.5 comparison, and exposure reduction metric.
 */
export function ImpactSummary({
  aqiData,
  response,
  isAqiUnavailable,
  isLoading,
  onEnableManualAqi,
  onSubmitManualAqi,
}: ImpactSummaryProps): ReactElement | null {
  if (isLoading || (!aqiData && !isAqiUnavailable)) {
    return null;
  }

  const categoryInfo = aqiData ? getAqiCategoryInfo(aqiData.category) : null;
  const combinedReduction = response ? calculateTotalPM25Reduction(response.recommendations) : 0;
  const surfaceClass = categoryInfo ? AQI_VISUAL_TOKENS[categoryInfo.id].surfaceClass : '';

  return (
    <SectionCard title={UI_LABELS.IMPACT_SECTION_TITLE}>
      <div className="space-y-5 text-sm">
        {isAqiUnavailable && (
          <ManualAqiForm isLoading={isLoading} onSubmitManualAqi={onSubmitManualAqi} />
        )}

        {aqiData && categoryInfo && (
          <>
            <div className={`rounded-2xl border p-5 ${surfaceClass}`}>
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <AqiGauge aqi={aqiData.aqi} category={categoryInfo} />

                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge category={categoryInfo} />
                    <span className="inline-flex items-center rounded-full border border-slate-300 bg-white/80 px-2.5 py-0.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                      {aqiData.source === 'manual'
                        ? APP_TEXT.MANUAL_AQI_SOURCE_LABEL
                        : APP_TEXT.LIVE_AQI_SOURCE_LABEL}
                    </span>
                  </div>

                  <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {aqiData.city}, {aqiData.country}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {categoryInfo.healthGuidance}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3.5 dark:border-slate-700/70">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="font-semibold text-slate-900 tabular-nums dark:text-slate-100">
                    {UI_LABELS.PM25_LABEL}: {formatPM25Value(aqiData.pm25)}
                  </span>
                  <span className="text-sm text-slate-600 tabular-nums dark:text-slate-300">
                    {UI_LABELS.WHO_GUIDELINE_LABEL} {formatPM25Value(WHO_PM25_GUIDELINE_UG_M3)}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {formatTimestamp(aqiData.updatedAt)}
                  </span>
                </div>

                {!isAqiUnavailable && (
                  <button
                    type="button"
                    onClick={onEnableManualAqi}
                    className="inline-flex min-h-11 items-center rounded-xl px-2.5 text-sm font-semibold text-teal-800 underline underline-offset-4 hover:no-underline dark:text-teal-300"
                  >
                    {UI_LABELS.SWITCH_TO_MANUAL_LABEL}
                  </button>
                )}
              </div>
            </div>

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
