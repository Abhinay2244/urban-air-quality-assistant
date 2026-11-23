import type { ReactElement } from 'react';
import { UI_COPY } from '../../constants/uiTheme.ts';
import type { DailyPlanSlot, OutdoorWindow } from '../../types/index.ts';
import { formatPM25Value } from '../../utils/formatting.ts';
import { OutdoorWindowCard } from './OutdoorWindowCard.tsx';

/**
 * Props for TodaysPlanCard component.
 */
export interface TodaysPlanCardProps {
  slots: readonly DailyPlanSlot[];
  bestWindow: OutdoorWindow | null;
}

/**
 * Renders Today's plan (Morning/Afternoon/Evening PM2.5 slots) alongside the best 2h outdoor window.
 */
export function TodaysPlanCard({ slots, bestWindow }: TodaysPlanCardProps): ReactElement | null {
  if (slots.length === 0 && !bestWindow) {
    return null;
  }

  return (
    <div className="space-y-3">
      {bestWindow && <OutdoorWindowCard window={bestWindow} />}

      {slots.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {UI_COPY.TODAYS_PLAN_TITLE}
          </p>
          <p className="mt-0.5 mb-3 text-sm text-slate-600 dark:text-slate-400">
            {UI_COPY.TODAYS_PLAN_SUBTITLE}
          </p>
          <ul className="grid gap-3 sm:grid-cols-3">
            {slots.map((slot) => (
              <li
                key={slot.id}
                className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {slot.label}
                  </span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {slot.timeRange}
                  </span>
                </div>
                <p className="mt-1 text-sm font-bold text-teal-800 tabular-nums dark:text-teal-300">
                  {formatPM25Value(slot.averagePm25)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {slot.action}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
