import type { ReactElement } from 'react';
import { APP_TEXT } from '@shared/constants/config.ts';
import { UI_COPY } from '../constants/uiTheme.ts';
import { LogoMarkIcon } from './Icons.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';

/**
 * Visually hidden skip link revealed on keyboard focus to jump straight to main content.
 */
export function SkipToMainLink(): ReactElement {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-xl focus:bg-teal-700 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-md dark:focus:bg-teal-400 dark:focus:text-slate-950"
    >
      {APP_TEXT.SKIP_TO_MAIN_CONTENT}
    </a>
  );
}

/**
 * Top navigation header displaying app brand mark, tagline, and light/dark theme toggle.
 */
export function AppHeader(): ReactElement {
  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <LogoMarkIcon className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
              {APP_TEXT.APP_TITLE}
            </p>
            <p className="truncate text-sm text-teal-800 dark:text-teal-300">{UI_COPY.TAGLINE}</p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}

/**
 * Hero headline and concise subtitle shown above the workspace grid.
 */
export function HeroSection(): ReactElement {
  return (
    <section className="max-w-3xl space-y-2">
      <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-slate-50">
        {UI_COPY.HERO_HEADLINE}
      </h1>
      <p className="text-base text-slate-600 dark:text-slate-300">{UI_COPY.HERO_SUBTITLE}</p>
    </section>
  );
}

/**
 * Footer displaying live/AI data attribution, educational disclaimer, and guidance note.
 */
export function AppFooter(): ReactElement {
  return (
    <footer className="border-t border-slate-200/80 bg-white/70 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mx-auto max-w-6xl space-y-1.5 px-4 py-6 text-sm text-slate-600 sm:px-6 dark:text-slate-400">
        <p className="font-medium text-slate-800 dark:text-slate-200">
          {UI_COPY.DATA_SOURCES} · {UI_COPY.DISCLAIMER}
        </p>
        <p>{APP_TEXT.FOOTER_NOTE}</p>
      </div>
    </footer>
  );
}
