import { type FormEvent, type ReactElement, useState } from 'react';
import { APP_TEXT, ERROR_MESSAGES, INPUT_LIMITS, UI_LABELS } from '../../constants/config.ts';

/**
 * Props for ManualAqiForm component.
 */
export interface ManualAqiFormProps {
  isLoading: boolean;
  onSubmitManualAqi: (aqi: number, pm25?: number) => void;
}

const MANUAL_AQI_ID = 'manual-aqi-input';
const MANUAL_AQI_ERROR_ID = 'manual-aqi-error';
const MANUAL_PM25_ID = 'manual-pm25-input';
const DEFAULT_MANUAL_AQI = '180';

/**
 * Fallback form allowing users to supply a local AQI reading if the live AQI API fails.
 */
export function ManualAqiForm({ isLoading, onSubmitManualAqi }: ManualAqiFormProps): ReactElement {
  const [aqiInput, setAqiInput] = useState<string>(DEFAULT_MANUAL_AQI);
  const [pm25Input, setPm25Input] = useState<string>('');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const validateAndParseAqi = (raw: string): number | null => {
    const parsed = Number(raw);
    if (
      raw.trim() === '' ||
      !Number.isFinite(parsed) ||
      parsed < INPUT_LIMITS.MIN_AQI_VALUE ||
      parsed > INPUT_LIMITS.MAX_AQI_VALUE
    ) {
      return null;
    }
    return parsed;
  };

  const handleAqiChange = (value: string): void => {
    setAqiInput(value);
    setInlineError(validateAndParseAqi(value) === null ? ERROR_MESSAGES.INVALID_MANUAL_AQI : null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const parsedAqi = validateAndParseAqi(aqiInput);
    if (parsedAqi === null) {
      setInlineError(ERROR_MESSAGES.INVALID_MANUAL_AQI);
      return;
    }
    const parsedPm25 = pm25Input.trim() === '' ? undefined : Number(pm25Input);
    onSubmitManualAqi(parsedAqi, parsedPm25);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 text-sm">
          <label
            htmlFor={MANUAL_AQI_ID}
            className="block font-semibold text-slate-800 dark:text-slate-200"
          >
            {UI_LABELS.MANUAL_AQI_INPUT_LABEL}
          </label>
          <input
            id={MANUAL_AQI_ID}
            type="number"
            min={INPUT_LIMITS.MIN_AQI_VALUE}
            max={INPUT_LIMITS.MAX_AQI_VALUE}
            value={aqiInput}
            aria-invalid={Boolean(inlineError)}
            aria-describedby={inlineError ? MANUAL_AQI_ERROR_ID : undefined}
            onChange={(event) => handleAqiChange(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          {inlineError && (
            <p
              id={MANUAL_AQI_ERROR_ID}
              role="alert"
              className="text-sm font-medium text-red-700 dark:text-red-300"
            >
              {inlineError}
            </p>
          )}
        </div>

        <div className="space-y-1.5 text-sm">
          <label
            htmlFor={MANUAL_PM25_ID}
            className="block font-semibold text-slate-800 dark:text-slate-200"
          >
            {UI_LABELS.MANUAL_PM25_INPUT_LABEL}
          </label>
          <input
            id={MANUAL_PM25_ID}
            type="number"
            min={0}
            max={INPUT_LIMITS.MAX_PM25_VALUE}
            value={pm25Input}
            onChange={(event) => setPm25Input(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-base text-slate-900 tabular-nums dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || Boolean(inlineError)}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300"
      >
        {UI_LABELS.MANUAL_AQI_SUBMIT_LABEL}
      </button>
    </form>
  );
}
