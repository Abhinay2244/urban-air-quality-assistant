import { type ReactElement, useEffect, useState } from 'react';
import { APP_TEXT } from '@shared/constants/config.ts';
import { INPUT_LIMITS } from '@shared/constants/limits.ts';

const SKELETON_SECTION_COUNT = 4;

/**
 * Accessible loading skeleton mirroring the AQI gauge card and categorized recommendation layout.
 */
export function LoadingSkeleton(): ReactElement {
  const [showSlowNote, setShowSlowNote] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSlowNote(true);
    }, INPUT_LIMITS.SLOW_LOADING_NOTE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div role="status" aria-label={APP_TEXT.LOADING_LABEL} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-4 text-sm font-medium text-teal-800 dark:text-teal-300">
          {APP_TEXT.LOADING_LABEL}
        </p>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="h-32 w-32 shrink-0 rounded-full bg-slate-200 motion-safe:animate-pulse dark:bg-slate-800" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-40 rounded-lg bg-slate-200 motion-safe:animate-pulse dark:bg-slate-800" />
            <div className="h-4 w-full rounded-lg bg-slate-100 motion-safe:animate-pulse dark:bg-slate-800/70" />
            <div className="h-4 w-3/4 rounded-lg bg-slate-100 motion-safe:animate-pulse dark:bg-slate-800/70" />
          </div>
        </div>
        <div className="mt-6 h-3.5 w-full rounded-full bg-slate-200 motion-safe:animate-pulse dark:bg-slate-800" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4">
          {Array.from({ length: SKELETON_SECTION_COUNT }, (_, index) => (
            <div
              key={index}
              className="space-y-2.5 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <div className="h-5 w-1/2 rounded-lg bg-slate-200 motion-safe:animate-pulse dark:bg-slate-800" />
              <div className="h-4 w-full rounded-lg bg-slate-100 motion-safe:animate-pulse dark:bg-slate-800/70" />
              <div className="h-4 w-5/6 rounded-lg bg-slate-100 motion-safe:animate-pulse dark:bg-slate-800/70" />
            </div>
          ))}
        </div>
      </div>

      {showSlowNote && (
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          {APP_TEXT.SLOW_LOADING_NOTE}
        </p>
      )}
    </div>
  );
}
