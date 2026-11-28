import type { ReactElement } from 'react';
import { UI_LABELS } from '@shared/constants/config.ts';
import { INPUT_LIMITS } from '@shared/constants/limits.ts';
import { ManualMetricField } from './ManualMetricField.tsx';

/** Props for ManualMetricsGrid component. */
export interface ManualMetricsGridProps {
  aqiInput: string;
  pm25Input: string;
  pm10Input: string;
  inlineError: string | null;
  pm25Error: string | null;
  pm10Error: string | null;
  onAqiChange: (val: string) => void;
  onPm25Change: (val: string) => void;
  onPm10Change: (val: string) => void;
}

/** Responsive 3-column grid of manual AQI, PM2.5, and PM10 inputs. */
export function ManualMetricsGrid({
  aqiInput,
  pm25Input,
  pm10Input,
  inlineError,
  pm25Error,
  pm10Error,
  onAqiChange,
  onPm25Change,
  onPm10Change,
}: Readonly<ManualMetricsGridProps>): ReactElement {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <ManualMetricField
        id="manual-aqi-input"
        errorId="manual-aqi-error"
        label={UI_LABELS.MANUAL_AQI_INPUT_LABEL}
        value={aqiInput}
        min={INPUT_LIMITS.MIN_AQI_VALUE}
        max={INPUT_LIMITS.MAX_AQI_VALUE}
        error={inlineError}
        onChange={onAqiChange}
      />
      <ManualMetricField
        id="manual-pm25-input"
        errorId="manual-pm25-error"
        label={UI_LABELS.MANUAL_PM25_INPUT_LABEL}
        value={pm25Input}
        min={INPUT_LIMITS.MIN_AQI_VALUE}
        max={INPUT_LIMITS.MAX_PM25_VALUE}
        error={pm25Error}
        onChange={onPm25Change}
      />
      <ManualMetricField
        id="manual-pm10-input"
        errorId="manual-pm10-error"
        label={UI_LABELS.MANUAL_PM10_INPUT_LABEL}
        value={pm10Input}
        min={INPUT_LIMITS.MIN_AQI_VALUE}
        max={INPUT_LIMITS.MAX_PM10_VALUE}
        error={pm10Error}
        onChange={onPm10Change}
      />
    </div>
  );
}
