import type { ReactElement } from 'react';
import { AqiGauge } from '../../components/AqiGauge.tsx';
import { SeverityBadge } from '../../components/SeverityBadge.tsx';
import {
  MAX_STANDARD_AQI,
  WHO_PM10_GUIDELINE_UG_M3,
  WHO_PM25_GUIDELINE_UG_M3,
} from '../../constants/aqi.ts';
import { APP_TEXT, UI_LABELS } from '../../constants/config.ts';
import { DEFAULT_COUNTRY } from '../../constants/server.ts';
import { AQI_VISUAL_TOKENS, UI_COPY } from '../../constants/uiTheme.ts';
import type { AqiCategoryInfo, AqiData } from '../../types/index.ts';
import { formatPM25Value, formatTimestamp } from '../../utils/formatting.ts';

/** Props for AqiHeroCard component. */
export interface AqiHeroCardProps {
  aqiData: AqiData;
  categoryInfo: AqiCategoryInfo;
  isAqiUnavailable: boolean;
  onEnableManualAqi: () => void;
}

function getSourceBadgeLabel(aqiData: AqiData): string {
  if (aqiData.source === 'manual') return APP_TEXT.MANUAL_AQI_SOURCE_LABEL;
  if (aqiData.provider === 'waqi') return APP_TEXT.LIVE_WAQI_SOURCE_LABEL;
  if (aqiData.provider === 'open-meteo') return APP_TEXT.LIVE_OPEN_METEO_SOURCE_LABEL;
  return APP_TEXT.LIVE_AQI_SOURCE_LABEL;
}

/**
 * Displays the US-scale AQI circular gauge hero card, station, timestamp, source, WHO comparison, and warnings.
 */
export function AqiHeroCard({
  aqiData,
  categoryInfo,
  isAqiUnavailable,
  onEnableManualAqi,
}: AqiHeroCardProps): ReactElement {
  const surfaceClass = AQI_VISUAL_TOKENS[categoryInfo.id].surfaceClass;
  const isAboveScale = aqiData.aqi > MAX_STANDARD_AQI;
  const placeHeadline =
    aqiData.country && aqiData.country !== DEFAULT_COUNTRY
      ? `${aqiData.city}, ${aqiData.country}`
      : aqiData.city;

  return (
    <div className={`rounded-2xl border p-5 ${surfaceClass}`}>
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <AqiGauge aqi={aqiData.aqi} category={categoryInfo} />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge category={categoryInfo} />
            {isAboveScale && (
              <span className="inline-flex items-center rounded-full border border-rose-400 bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200">
                {UI_COPY.ABOVE_SCALE_NOTE}
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-white/80 px-2.5 py-0.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
              {getSourceBadgeLabel(aqiData)}
            </span>
          </div>

          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {placeHeadline}
          </p>
          {aqiData.stationName && aqiData.stationName !== aqiData.city && (
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {UI_LABELS.STATION_LABEL}: {aqiData.stationName}
            </p>
          )}
          <p className="text-xs text-slate-600 dark:text-slate-400">{APP_TEXT.AQI_SCALE_LABEL}</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {categoryInfo.healthGuidance}
          </p>
        </div>
      </div>

      {aqiData.locationWarning && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-950 dark:border-amber-700/80 dark:bg-amber-950/60 dark:text-amber-100"
        >
          {aqiData.locationWarning}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3.5 dark:border-slate-700/70">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-semibold text-slate-900 tabular-nums dark:text-slate-100">
            {UI_LABELS.PM25_LABEL}: {formatPM25Value(aqiData.pm25)}{' '}
            <span className="font-normal text-slate-600 dark:text-slate-300">
              ({UI_LABELS.WHO_GUIDELINE_LABEL} {formatPM25Value(WHO_PM25_GUIDELINE_UG_M3)})
            </span>
          </span>
          <span className="font-semibold text-slate-900 tabular-nums dark:text-slate-100">
            {UI_LABELS.PM10_LABEL}:{' '}
            {aqiData.pm10 !== undefined ? formatPM25Value(aqiData.pm10) : APP_TEXT.NOT_AVAILABLE}{' '}
            <span className="font-normal text-slate-600 dark:text-slate-300">
              ({UI_LABELS.WHO_GUIDELINE_LABEL} {formatPM25Value(WHO_PM10_GUIDELINE_UG_M3)})
            </span>
          </span>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {aqiData.updatedAt ? formatTimestamp(aqiData.updatedAt) : APP_TEXT.NOT_AVAILABLE}
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
  );
}
