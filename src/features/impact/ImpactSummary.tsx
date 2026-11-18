import type { ReactElement } from 'react';
import { SectionCard } from '../../components/SectionCard.tsx';
import { StatusBadge } from '../../components/StatusBadge.tsx';
import { APP_TEXT, UI_LABELS } from '../../constants/config.ts';
import type { AQIData, AssistantResponse } from '../../types/index.ts';
import {
  calculateTotalPM25Reduction,
  formatPM25Value,
  formatTimestamp,
  getAQICategoryInfo,
} from '../../utils/formatting.ts';

/**
 * Props for ImpactSummary feature component.
 */
export interface ImpactSummaryProps {
  aqiData: AQIData | null;
  response: AssistantResponse | null;
}

/**
 * Displays live city AQI severity, health guidance, and combined PM2.5 reduction estimate.
 */
export function ImpactSummary({ aqiData, response }: ImpactSummaryProps): ReactElement | null {
  if (!aqiData) {
    return null;
  }

  const categoryInfo = getAQICategoryInfo(aqiData.category);
  const combinedReduction = response ? calculateTotalPM25Reduction(response.recommendations) : 0;

  return (
    <SectionCard title={UI_LABELS.IMPACT_SECTION_TITLE}>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">
              {aqiData.city}, {aqiData.country}
            </p>
            <p className="text-xs text-slate-500">{formatTimestamp(aqiData.updatedAt)}</p>
          </div>
          <StatusBadge category={categoryInfo} />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs text-slate-500">{UI_LABELS.AQI_LABEL}</p>
            <p className="text-lg font-semibold text-slate-900">{aqiData.aqi}</p>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs text-slate-500">{UI_LABELS.PM25_LABEL}</p>
            <p className="text-lg font-semibold text-slate-900">{formatPM25Value(aqiData.pm25)}</p>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs text-slate-500">{UI_LABELS.COMBINED_REDUCTION_LABEL}</p>
            <p className="text-lg font-semibold text-slate-900">
              {combinedReduction}
              {APP_TEXT.REDUCTION_PERCENT_UNIT}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-700">{categoryInfo.healthGuidance}</p>
      </div>
    </SectionCard>
  );
}
