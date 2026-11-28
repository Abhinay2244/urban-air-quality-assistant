import type { ReactElement } from 'react';
import { UI_COPY } from '../../constants/uiTheme.ts';
import type { OutdoorWindow } from '@shared/types/index.ts';
import { formatClockTime, formatPM25Value } from '@shared/utils/formatting.ts';

/**
 * Props for OutdoorWindowCard component.
 */
export interface OutdoorWindowCardProps {
  window: OutdoorWindow;
}

/**
 * Displays the lowest-exposure continuous outdoor activity window from the 24h PM2.5 forecast.
 */
export function OutdoorWindowCard({ window }: Readonly<OutdoorWindowCardProps>): ReactElement {
  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 dark:border-teal-800/70 dark:bg-teal-950/35">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-teal-950 dark:text-teal-100">
            {UI_COPY.BEST_OUTDOOR_TITLE}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {UI_COPY.BEST_OUTDOOR_SUBTITLE}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-base font-bold text-teal-900 tabular-nums dark:text-teal-200">
            {formatClockTime(window.startTime)} – {formatClockTime(window.endTime)}
          </p>
          <p className="text-sm font-medium text-slate-700 tabular-nums dark:text-slate-300">
            {UI_COPY.BEST_OUTDOOR_AVG_LABEL}: {formatPM25Value(window.averagePm25)}
          </p>
        </div>
      </div>
    </div>
  );
}
