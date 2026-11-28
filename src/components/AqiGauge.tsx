import type { ReactElement } from 'react';
import { MAX_STANDARD_AQI, MIN_STANDARD_AQI } from '@shared/constants/aqi.ts';
import { APP_TEXT, UI_LABELS } from '@shared/constants/config.ts';
import { AQI_VISUAL_TOKENS, GAUGE_METRICS, UI_COPY } from '../constants/uiTheme.ts';
import type { AqiCategoryInfo } from '@shared/types/index.ts';
import { clampRounded } from '@shared/utils/math.ts';

/**
 * Props for AqiGauge component.
 */
export interface AqiGaugeProps {
  aqi: number;
  category: AqiCategoryInfo;
}

/**
 * Circular inline SVG gauge displaying the real US-scale AQI (including >500 values with an above-scale note).
 */
export function AqiGauge({ aqi, category }: Readonly<AqiGaugeProps>): ReactElement {
  const { RADIUS, STROKE_WIDTH, VIEWBOX_SIZE } = GAUGE_METRICS;
  const center = VIEWBOX_SIZE / 2;
  const circumference = 2 * Math.PI * RADIUS;
  const displayAqi = Number.isFinite(aqi) && aqi >= MIN_STANDARD_AQI ? Math.round(aqi) : 0;
  const isAboveScale = displayAqi > MAX_STANDARD_AQI;
  const clampedForRing = clampRounded(displayAqi, MIN_STANDARD_AQI, MAX_STANDARD_AQI);
  const progress = clampedForRing / MAX_STANDARD_AQI;
  const dashOffset = circumference * (1 - progress);
  const strokeColor = AQI_VISUAL_TOKENS[category.id].strokeHex;
  const scalePrefix = `${UI_LABELS.AQI_LABEL} (${APP_TEXT.AQI_GAUGE_SCALE_LABEL})`;
  const ariaLabel = isAboveScale
    ? `${scalePrefix} ${displayAqi} (${UI_COPY.ABOVE_SCALE_NOTE}): ${category.label}`
    : `${scalePrefix} ${displayAqi}: ${category.label}`;

  return (
    <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
      <svg
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        role="img"
        aria-label={ariaLabel}
        className="h-full w-full -rotate-90"
      >
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx={center}
          cy={center}
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-200"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-slate-50">
          {displayAqi}
        </span>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {isAboveScale ? UI_COPY.ABOVE_SCALE_NOTE : UI_LABELS.AQI_LABEL}
        </span>
      </div>
    </div>
  );
}
