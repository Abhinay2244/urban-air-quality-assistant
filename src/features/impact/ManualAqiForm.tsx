import { type ReactElement, type SyntheticEvent, useState } from 'react';
import { APP_TEXT, UI_LABELS } from '@shared/constants/config.ts';
import {
  type ValidationResult,
  validateManualAqi,
  validateOptionalPm10,
  validateOptionalPm25,
} from '@shared/utils/validation.ts';
import { ManualMetricsGrid } from './ManualMetricsGrid.tsx';

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

const readErrorMsg = <T,>(res: ValidationResult<T>): string | null =>
  res.isValid ? null : (res.error?.message ?? null);

function useManualAqiFields(): {
  aqiInput: string;
  pm25Input: string;
  pm10Input: string;
  inlineError: string | null;
  pm25Error: string | null;
  pm10Error: string | null;
  onAqiChange: (val: string) => void;
  onPm25Change: (val: string) => void;
  onPm10Change: (val: string) => void;
  submitIfValid: (onSubmit: (aqi: number, pm25?: number, pm10?: number) => void) => void;
} {
  const [aqiInput, setAqiInput] = useState<string>(DEFAULT_MANUAL_AQI);
  const [pm25Input, setPm25Input] = useState<string>('');
  const [pm10Input, setPm10Input] = useState<string>('');
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [pm25Error, setPm25Error] = useState<string | null>(null);
  const [pm10Error, setPm10Error] = useState<string | null>(null);

  return {
    aqiInput,
    pm25Input,
    pm10Input,
    inlineError,
    pm25Error,
    pm10Error,
    onAqiChange: (val) => {
      setAqiInput(val);
      setInlineError(readErrorMsg(validateManualAqi(val)));
    },
    onPm25Change: (val) => {
      setPm25Input(val);
      setPm25Error(readErrorMsg(validateOptionalPm25(val)));
    },
    onPm10Change: (val) => {
      setPm10Input(val);
      setPm10Error(readErrorMsg(validateOptionalPm10(val)));
    },
    submitIfValid: (onSubmit) => {
      const aqiRes = validateManualAqi(aqiInput);
      const pm25Res = validateOptionalPm25(pm25Input);
      const pm10Res = validateOptionalPm10(pm10Input);
      setInlineError(readErrorMsg(aqiRes));
      setPm25Error(readErrorMsg(pm25Res));
      setPm10Error(readErrorMsg(pm10Res));
      if (aqiRes.isValid && pm25Res.isValid && pm10Res.isValid) {
        onSubmit(aqiRes.value, pm25Res.value, pm10Res.value);
      }
    },
  };
}

/**
 * Fallback form allowing users to supply local AQI, optional PM2.5, and optional PM10 readings.
 */
export function ManualAqiForm({
  isLoading,
  onSubmitManualAqi,
}: Readonly<ManualAqiFormProps>): ReactElement {
  const fields = useManualAqiFields();
  const hasError =
    Boolean(fields.inlineError) || Boolean(fields.pm25Error) || Boolean(fields.pm10Error);

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    fields.submitIfValid(onSubmitManualAqi);
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
      <ManualMetricsGrid
        aqiInput={fields.aqiInput}
        pm25Input={fields.pm25Input}
        pm10Input={fields.pm10Input}
        inlineError={fields.inlineError}
        pm25Error={fields.pm25Error}
        pm10Error={fields.pm10Error}
        onAqiChange={fields.onAqiChange}
        onPm25Change={fields.onPm25Change}
        onPm10Change={fields.onPm10Change}
      />
      <button
        type="submit"
        disabled={isLoading || hasError}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
      >
        {UI_LABELS.MANUAL_AQI_SUBMIT_LABEL}
      </button>
    </form>
  );
}
