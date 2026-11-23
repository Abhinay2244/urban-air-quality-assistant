import { type FormEvent, type ReactElement, useState } from 'react';
import { APP_TEXT, UI_LABELS } from '../../constants/config.ts';
import { INPUT_LIMITS } from '../../constants/limits.ts';
import {
  validateManualAqi,
  validateOptionalPm10,
  validateOptionalPm25,
} from '../../utils/validation.ts';
import { ManualMetricField } from './ManualMetricField.tsx';

/**
 * Props for ManualAqiForm component.
 */
export interface ManualAqiFormProps {
  isLoading: boolean;
  onSubmitManualAqi: (aqi: number, pm25?: number, pm10?: number) => void;
}

// Why: Default to 180 (US EPA Unhealthy winter smog midpoint) so users hitting an AQI API outage
// can submit immediately or adjust upward/downward from a realistic smog baseline.
const DEFAULT_MANUAL_AQI = '180';

/**
 * Fallback form allowing users to supply local AQI, optional PM2.5, and optional PM10 readings.
 */
export function ManualAqiForm({ isLoading, onSubmitManualAqi }: ManualAqiFormProps): ReactElement {
  const [aqiInput, setAqiInput] = useState<string>(DEFAULT_MANUAL_AQI);
  const [pm25Input, setPm25Input] = useState<string>('');
  const [pm10Input, setPm10Input] = useState<string>('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [pm25Error, setPm25Error] = useState<string | null>(null);
  const [pm10Error, setPm10Error] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const aqiResult = validateManualAqi(aqiInput);
    const pm25Result = validateOptionalPm25(pm25Input);
    const pm10Result = validateOptionalPm10(pm10Input);
    setInlineError(aqiResult.isValid ? null : (aqiResult.error?.message ?? null));
    setPm25Error(pm25Result.isValid ? null : (pm25Result.error?.message ?? null));
    setPm10Error(pm10Result.isValid ? null : (pm10Result.error?.message ?? null));
    if (!aqiResult.isValid || !pm25Result.isValid || !pm10Result.isValid) {
      return;
    }
    onSubmitManualAqi(aqiResult.value, pm25Result.value, pm10Result.value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-2xl border border-amber-300 bg-amber-50/90 p-5 dark:border-amber-700/80 dark:bg-amber-950/40"
    >
      <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
        {APP_TEXT.MANUAL_AQI_NOTICE}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <ManualMetricField
          id="manual-aqi-input"
          errorId="manual-aqi-error"
          label={UI_LABELS.MANUAL_AQI_INPUT_LABEL}
          value={aqiInput}
          min={INPUT_LIMITS.MIN_AQI_VALUE}
          max={INPUT_LIMITS.MAX_AQI_VALUE}
          error={inlineError}
          onChange={(val) => {
            setAqiInput(val);
            const res = validateManualAqi(val);
            setInlineError(res.isValid ? null : (res.error?.message ?? null));
          }}
        />
        <ManualMetricField
          id="manual-pm25-input"
          errorId="manual-pm25-error"
          label={UI_LABELS.MANUAL_PM25_INPUT_LABEL}
          value={pm25Input}
          min={INPUT_LIMITS.MIN_AQI_VALUE}
          max={INPUT_LIMITS.MAX_PM25_VALUE}
          error={pm25Error}
          onChange={(val) => {
            setPm25Input(val);
            const res = validateOptionalPm25(val);
            setPm25Error(res.isValid ? null : (res.error?.message ?? null));
          }}
        />
        <ManualMetricField
          id="manual-pm10-input"
          errorId="manual-pm10-error"
          label={UI_LABELS.MANUAL_PM10_INPUT_LABEL}
          value={pm10Input}
          min={INPUT_LIMITS.MIN_AQI_VALUE}
          max={INPUT_LIMITS.MAX_PM10_VALUE}
          error={pm10Error}
          onChange={(val) => {
            setPm10Input(val);
            const res = validateOptionalPm10(val);
            setPm10Error(res.isValid ? null : (res.error?.message ?? null));
          }}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || Boolean(inlineError) || Boolean(pm25Error) || Boolean(pm10Error)}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
      >
        {UI_LABELS.MANUAL_AQI_SUBMIT_LABEL}
      </button>
    </form>
  );
}
