import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UI_LABELS } from '../../constants/config.ts';
import { ERROR_MESSAGES } from '../../constants/http.ts';
import { ManualAqiForm } from '../../features/impact/ManualAqiForm.tsx';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ManualAqiForm', () => {
  it('rejects AQI above the allowed range with inline error and aria-describedby', () => {
    const onSubmitManualAqi = vi.fn();
    render(<ManualAqiForm isLoading={false} onSubmitManualAqi={onSubmitManualAqi} />);

    const aqiInput = screen.getByLabelText<HTMLInputElement>(UI_LABELS.MANUAL_AQI_INPUT_LABEL);
    fireEvent.change(aqiInput, { target: { value: '550' } });

    expect(aqiInput).toHaveAttribute('aria-invalid', 'true');
    expect(aqiInput).toHaveAttribute('aria-describedby', 'manual-aqi-error');
    expect(aqiInput).toHaveAccessibleDescription(ERROR_MESSAGES.INVALID_MANUAL_AQI);
    expect(screen.getByRole('alert')).toHaveTextContent(ERROR_MESSAGES.INVALID_MANUAL_AQI);

    const submitButton = screen.getByRole<HTMLButtonElement>('button', {
      name: UI_LABELS.MANUAL_AQI_SUBMIT_LABEL,
    });
    expect(submitButton).toBeDisabled();
    fireEvent.click(submitButton);
    expect(onSubmitManualAqi).not.toHaveBeenCalled();
  });

  it('rejects invalid optional PM2.5 values with inline error', () => {
    const onSubmitManualAqi = vi.fn();
    render(<ManualAqiForm isLoading={false} onSubmitManualAqi={onSubmitManualAqi} />);

    const pm25Input = screen.getByLabelText<HTMLInputElement>(UI_LABELS.MANUAL_PM25_INPUT_LABEL);
    fireEvent.change(pm25Input, { target: { value: '1200' } });

    expect(pm25Input).toHaveAttribute('aria-invalid', 'true');
    expect(pm25Input).toHaveAttribute('aria-describedby', 'manual-pm25-error');
    expect(pm25Input).toHaveAccessibleDescription(ERROR_MESSAGES.INVALID_MANUAL_PM25);
    expect(screen.getByRole('alert')).toHaveTextContent(ERROR_MESSAGES.INVALID_MANUAL_PM25);
    expect(onSubmitManualAqi).not.toHaveBeenCalled();
  });

  it('accepts valid AQI and optional PM2.5 values and calls submit callback', () => {
    const onSubmitManualAqi = vi.fn();
    render(<ManualAqiForm isLoading={false} onSubmitManualAqi={onSubmitManualAqi} />);

    fireEvent.change(screen.getByLabelText<HTMLInputElement>(UI_LABELS.MANUAL_AQI_INPUT_LABEL), {
      target: { value: '220' },
    });
    fireEvent.change(screen.getByLabelText<HTMLInputElement>(UI_LABELS.MANUAL_PM25_INPUT_LABEL), {
      target: { value: '145' },
    });

    fireEvent.click(screen.getByRole('button', { name: UI_LABELS.MANUAL_AQI_SUBMIT_LABEL }));
    expect(onSubmitManualAqi).toHaveBeenCalledTimes(1);
    expect(onSubmitManualAqi).toHaveBeenCalledWith(220, 145);
  });
});
